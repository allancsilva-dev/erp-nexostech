import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';

export type AuditLogEntity = {
  id: string;
  branchId: string | null;
  userId: string;
  userEmail?: string | null;
  action: string;
  entity: string;
  entityId: string;
  requestId: string | null;
  ipAddress?: string | null;
  fieldChanges?: unknown[];
  createdAt: string;
};

@Injectable()
export class AuditRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private toText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }
    return '';
  }

  private toNullableText(value: unknown): string | null {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }
    return null;
  }

  async list(
    page: number,
    pageSize: number,
  ): Promise<{ items: AuditLogEntity[]; total: number }> {
    const safePage = Math.max(page, 1);
    const safePageSize = Math.max(pageSize, 1);
    const offset = (safePage - 1) * safePageSize;
    const schema = quoteIdent(this.drizzleService.getTenantSchema());

    const totalResult = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT COUNT(*)::int AS total
      FROM ${schema}.audit_logs
    `),
    );

    const rowsResult = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, branch_id, user_id, user_email, action, entity, entity_id, request_id, ip_address, field_changes, created_at
      FROM ${schema}.audit_logs
      ORDER BY created_at DESC
      LIMIT ${safePageSize}
      OFFSET ${offset}
    `),
    );

    const totalRow = totalResult.rows[0] as Record<string, unknown> | undefined;
    const items = rowsResult.rows.map((row) => ({
      id: this.toText(row.id),
      branchId: this.toNullableText(row.branch_id),
      userId: this.toText(row.user_id),
      userEmail: this.toNullableText(row.user_email),
      action: this.toText(row.action),
      entity: this.toText(row.entity),
      entityId: this.toText(row.entity_id),
      requestId: this.toNullableText(row.request_id),
      ipAddress: this.toNullableText(row.ip_address),
      fieldChanges: Array.isArray(row.field_changes)
        ? (row.field_changes as unknown[])
        : [],
      createdAt: new Date(this.toText(row.created_at)).toISOString(),
    }));

    return {
      items,
      total: totalRow?.total ? Number(totalRow.total) : 0,
    };
  }

  async getById(id: string): Promise<AuditLogEntity | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, branch_id, user_id, user_email, action, entity, entity_id, request_id, ip_address, field_changes, created_at
      FROM ${schema}.audit_logs
      WHERE id = ${quoteLiteral(id)}
      LIMIT 1
    `),
    );

    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }

    return {
      id: this.toText(row.id),
      branchId: this.toNullableText(row.branch_id),
      userId: this.toText(row.user_id),
      userEmail: this.toNullableText(row.user_email),
      action: this.toText(row.action),
      entity: this.toText(row.entity),
      entityId: this.toText(row.entity_id),
      requestId: this.toNullableText(row.request_id),
      ipAddress: this.toNullableText(row.ip_address),
      fieldChanges: Array.isArray(row.field_changes)
        ? (row.field_changes as unknown[])
        : [],
      createdAt: new Date(this.toText(row.created_at)).toISOString(),
    };
  }
}
