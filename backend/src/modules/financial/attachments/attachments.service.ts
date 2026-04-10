import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { BusinessException } from '../../../common/exceptions/business.exception';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';
import { PresignDto } from './dto/presign.dto';
import { RegisterAttachmentDto } from './dto/register-attachment.dto';

type QueryRow = Record<string, unknown>;

type AttachmentRecord = {
  id: string;
  entryId: string;
  filename: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: string;
  uploadedBy: string;
  deletedAt: string | null;
  createdAt: string;
};

type AttachmentWithEntryRecord = {
  id: string;
  sizeBytes: string;
  deletedAt: string | null;
  entryBranchId: string;
};

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const PLAN_LIMITS: Record<string, number> = {
  STARTER: 2_147_483_648,
  PRO: 10_737_418_240,
  ENTERPRISE: 53_687_091_200,
};

function getRows(result: unknown): QueryRow[] {
  if (!result || typeof result !== 'object' || !('rows' in result)) {
    return [];
  }

  const rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as QueryRow[]) : [];
}

function toText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date
  ) {
    return String(value);
  }

  return fallback;
}

function toNullableText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const text = toText(value);
  return text.length > 0 ? text : null;
}

@Injectable()
export class AttachmentsService {
  private readonly bucket: string;
  private readonly s3Client: S3Client;

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.get<string>(
      'R2_BUCKET_NAME',
      'nexos-financeiro',
    );

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.configService.get<string>('R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get<string>(
          'R2_ACCESS_KEY_ID',
          'local-key',
        ),
        secretAccessKey: this.configService.get<string>(
          'R2_SECRET_ACCESS_KEY',
          'local-secret',
        ),
      },
      forcePathStyle: true,
    });
  }

  async generatePresignedUrl(
    dto: PresignDto,
    tenantId: string,
    branchId: string,
    userPlan: string,
  ): Promise<{ uploadUrl: string; storageKey: string }> {
    if (!ALLOWED_MIME_TYPES.has(dto.mimeType)) {
      throw new BusinessException('VALIDATION_FILE', HttpStatus.BAD_REQUEST, {
        mimeType: dto.mimeType,
      });
    }

    if (dto.sizeBytes > 10_485_760) {
      throw new BusinessException('VALIDATION_FILE', HttpStatus.BAD_REQUEST, {
        sizeBytes: dto.sizeBytes,
        maxSizeBytes: 10_485_760,
      });
    }

    await this.assertEntryExists(dto.entryId, branchId);

    const usedBytes = await this.getTenantStorageUsage(tenantId);
    const normalizedPlan = userPlan.toUpperCase();
    const limit = PLAN_LIMITS[normalizedPlan] ?? PLAN_LIMITS.STARTER;

    if (usedBytes + dto.sizeBytes > limit) {
      throw new BusinessException('STORAGE_LIMIT_EXCEEDED', 413, {
        usedBytes,
        limit,
        requestedBytes: dto.sizeBytes,
      });
    }

    const ext = this.getExtensionByMimeType(dto.mimeType);
    const randomPart = crypto.randomUUID();
    const storageKey = `${tenantId}/${branchId}/attachments/${randomPart}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: dto.mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    });

    return { uploadUrl, storageKey };
  }

  async registerAttachment(
    dto: RegisterAttachmentDto,
    userId: string,
    tenantId: string,
    branchId: string,
  ): Promise<AttachmentRecord> {
    await this.assertEntryExists(dto.entryId, branchId);

    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const tenantLiteral = quoteLiteral(tenantId);

    return this.drizzleService.transaction(async (tx) => {
      const insertResult = await tx.execute(
        sql.raw(`
        INSERT INTO ${schema}.attachments (
          entry_id,
          filename,
          storage_key,
          mime_type,
          size_bytes,
          uploaded_by,
          created_at
        ) VALUES (
          ${quoteLiteral(dto.entryId)},
          ${quoteLiteral(dto.filename)},
          ${quoteLiteral(dto.storageKey)},
          ${quoteLiteral(dto.mimeType)},
          ${quoteLiteral(dto.sizeBytes)},
          ${quoteLiteral(userId)},
          NOW()
        )
        RETURNING id, entry_id, filename, storage_key, mime_type, size_bytes, uploaded_by, deleted_at, created_at
      `),
      );

      const row = getRows(insertResult)[0];
      if (!row) {
        throw new BusinessException(
          'INTERNAL_ERROR',
          HttpStatus.INTERNAL_SERVER_ERROR,
          {
            entryId: dto.entryId,
            storageKey: dto.storageKey,
            operation: 'REGISTER_ATTACHMENT',
          },
        );
      }

      await tx.execute(
        sql.raw(`
        INSERT INTO public.tenant_storage_usage (tenant_id, used_bytes)
        VALUES (${tenantLiteral}, ${quoteLiteral(dto.sizeBytes)})
        ON CONFLICT (tenant_id)
        DO UPDATE SET used_bytes = public.tenant_storage_usage.used_bytes + ${quoteLiteral(dto.sizeBytes)}
      `),
      );

      await tx.execute(
        sql.raw(`
        INSERT INTO ${schema}.audit_logs (
          branch_id,
          user_id,
          action,
          entity,
          entity_id,
          metadata
        ) VALUES (
          ${quoteLiteral(branchId)},
          ${quoteLiteral(userId)},
          'CREATE',
          'attachments',
          ${quoteLiteral(toText(row.id))},
          ${quoteLiteral(
            JSON.stringify({
              entryId: dto.entryId,
              storageKey: dto.storageKey,
              sizeBytes: dto.sizeBytes,
            }),
          )}::jsonb
        )
      `),
      );

      return this.mapAttachmentRow(row);
    });
  }

  async softDeleteAttachment(
    id: string,
    userId: string,
    tenantId: string,
    branchId: string,
  ): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const branchLiteral = quoteLiteral(branchId);

    const existing = await this.findAttachmentWithEntry(id);
    if (!existing || existing.entryBranchId !== branchId) {
      throw new BusinessException('ATTACHMENT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    if (existing.deletedAt) {
      throw new BusinessException('VALIDATION_ERROR', HttpStatus.BAD_REQUEST, {
        attachmentId: id,
        reason: 'ALREADY_REMOVED',
      });
    }

    const sizeBytes = Number.parseInt(existing.sizeBytes, 10);
    const safeSize = Number.isNaN(sizeBytes) ? 0 : sizeBytes;

    await this.drizzleService.transaction(async (tx) => {
      await tx.execute(
        sql.raw(`
        UPDATE ${schema}.attachments
        SET deleted_at = NOW()
        WHERE id = ${idLiteral}
          AND deleted_at IS NULL
      `),
      );

      await tx.execute(
        sql.raw(`
        INSERT INTO public.tenant_storage_usage (tenant_id, used_bytes)
        VALUES (${quoteLiteral(tenantId)}, 0)
        ON CONFLICT (tenant_id)
        DO UPDATE SET used_bytes = GREATEST(0, public.tenant_storage_usage.used_bytes - ${quoteLiteral(safeSize)})
      `),
      );

      await tx.execute(
        sql.raw(`
        INSERT INTO ${schema}.audit_logs (
          branch_id,
          user_id,
          action,
          entity,
          entity_id,
          metadata
        ) VALUES (
          ${branchLiteral},
          ${quoteLiteral(userId)},
          'DELETE',
          'attachments',
          ${idLiteral},
          ${quoteLiteral(
            JSON.stringify({
              sizeBytes: safeSize,
            }),
          )}::jsonb
        )
      `),
      );
    });
  }

  private async assertEntryExists(
    entryId: string,
    branchId: string,
  ): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT 1
      FROM ${schema}.financial_entries
      WHERE id = ${quoteLiteral(entryId)}
        AND branch_id = ${quoteLiteral(branchId)}
        AND deleted_at IS NULL
      LIMIT 1
    `),
    );

    if (getRows(result).length === 0) {
      throw new BusinessException('ENTRY_NOT_FOUND', HttpStatus.NOT_FOUND, {
        entryId,
        branchId,
      });
    }
  }

  private async findAttachmentWithEntry(
    attachmentId: string,
  ): Promise<AttachmentWithEntryRecord | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT a.id, a.size_bytes, a.deleted_at, e.branch_id AS entry_branch_id
      FROM ${schema}.attachments a
      INNER JOIN ${schema}.financial_entries e ON e.id = a.entry_id
      WHERE a.id = ${quoteLiteral(attachmentId)}
        AND e.deleted_at IS NULL
      LIMIT 1
    `),
    );

    const row = getRows(result)[0];
    if (!row) {
      return null;
    }

    return {
      id: toText(row.id),
      sizeBytes: toText(row.size_bytes),
      deletedAt: toNullableText(row.deleted_at),
      entryBranchId: toText(row.entry_branch_id),
    };
  }

  private async getTenantStorageUsage(tenantId: string): Promise<number> {
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT used_bytes
      FROM public.tenant_storage_usage
      WHERE tenant_id = ${quoteLiteral(tenantId)}
      LIMIT 1
    `),
    );

    const row = getRows(result)[0];
    if (!row) {
      return 0;
    }

    const usedBytes = Number.parseInt(toText(row.used_bytes, '0'), 10);
    return Number.isNaN(usedBytes) ? 0 : usedBytes;
  }

  private getExtensionByMimeType(mimeType: string): string {
    if (mimeType === 'application/pdf') {
      return 'pdf';
    }

    if (mimeType === 'image/jpeg') {
      return 'jpg';
    }

    return 'png';
  }

  private mapAttachmentRow(row: QueryRow): AttachmentRecord {
    return {
      id: toText(row.id),
      entryId: toText(row.entry_id),
      filename: toText(row.filename),
      storageKey: toText(row.storage_key),
      mimeType: toText(row.mime_type),
      sizeBytes: toText(row.size_bytes),
      uploadedBy: toText(row.uploaded_by),
      deletedAt: toNullableText(row.deleted_at),
      createdAt: toText(row.created_at),
    };
  }
}
