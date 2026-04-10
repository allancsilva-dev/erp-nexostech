import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../infrastructure/database/sql-builder.util';
import { CreateBranchDto } from './dto/create-branch.dto';
import { BranchEntity } from './dto/branch.response';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesRepository {
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

  private mapRow(row: Record<string, unknown>): BranchEntity {
    return {
      id: this.toText(row.id),
      name: this.toText(row.name),
      legalName: this.toNullableText(row.legal_name),
      document: this.toNullableText(row.document),
      phone: this.toNullableText(row.phone),
      email: this.toNullableText(row.email),
      addressCity: this.toNullableText(row.address_city),
      addressState: this.toNullableText(row.address_state),
      addressZip: this.toNullableText(row.address_zip),
      isHeadquarters: Boolean(row.is_headquarters),
      active: Boolean(row.active),
    };
  }

  async list(): Promise<BranchEntity[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT
        id, name, legal_name, document, phone, email,
        address_city, address_state, address_zip,
        is_headquarters, active
      FROM ${schema}.branches
      WHERE deleted_at IS NULL
      ORDER BY created_at ASC
    `),
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async listByUser(userId: string): Promise<BranchEntity[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT
        b.id, b.name, b.legal_name, b.document, b.phone, b.email,
        b.address_city, b.address_state, b.address_zip,
        b.is_headquarters, b.active
      FROM ${schema}.branches b
      JOIN ${schema}.user_branches ub ON ub.branch_id = b.id
      WHERE ub.user_id = ${quoteLiteral(userId)}
        AND b.deleted_at IS NULL
      ORDER BY b.created_at ASC
    `),
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async create(dto: CreateBranchDto): Promise<BranchEntity> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const name = quoteLiteral(dto.name);
    const legalName = quoteLiteral(dto.legalName ?? null);
    const doc = dto.document?.replace(/\D/g, '') ?? null;
    const document = quoteLiteral(doc ?? null);
    const phone = dto.phone?.replace(/\D/g, '') ?? null;
    const phoneLiteral = quoteLiteral(phone ?? null);
    const email = quoteLiteral(dto.email ?? null);
    const addressCity = quoteLiteral(dto.addressCity ?? null);
    const addressState = quoteLiteral(dto.addressState ?? null);
    const zip = dto.addressZip?.replace(/\D/g, '') ?? null;
    const addressZip = quoteLiteral(zip ?? null);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      INSERT INTO ${schema}.branches (
        name, legal_name, document, phone, email, address_city, address_state, address_zip,
        is_headquarters, active
      ) VALUES (
        ${name}, ${legalName}, ${document}, ${phone}, ${email}, ${addressCity}, ${addressState}, ${addressZip},
        false, true
      )
      RETURNING
        id, name, legal_name, document, phone, email,
        address_city, address_state, address_zip,
        is_headquarters, active
    `),
    );

    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<BranchEntity | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT
        id, name, legal_name, document, phone, email,
        address_city, address_state, address_zip,
        is_headquarters, active
      FROM ${schema}.branches
      WHERE id = ${idLiteral}
        AND deleted_at IS NULL
      LIMIT 1
    `),
    );

    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  async update(id: string, dto: UpdateBranchDto): Promise<BranchEntity> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const sets: string[] = [];
    const doc = dto.document?.replace(/\D/g, '') ?? null;
    const phone = dto.phone?.replace(/\D/g, '') ?? null;
    const phoneLiteral = quoteLiteral(phone ?? null);

    if (dto.name !== undefined) sets.push(`name = ${quoteLiteral(dto.name)}`);
    if (dto.legalName !== undefined)
      sets.push(`legal_name = ${quoteLiteral(dto.legalName)}`);
    if (dto.document !== undefined)
      sets.push(`document = ${quoteLiteral(doc)}`);
    if (dto.phone !== undefined) sets.push(`phone = ${phoneLiteral}`);
    if (dto.email !== undefined)
      sets.push(`email = ${quoteLiteral(dto.email)}`);
    if (dto.addressCity !== undefined)
      sets.push(`address_city = ${quoteLiteral(dto.addressCity)}`);
    if (dto.addressState !== undefined)
      sets.push(`address_state = ${quoteLiteral(dto.addressState)}`);
    if (dto.addressZip !== undefined)
      sets.push(
        `address_zip = ${quoteLiteral(dto.addressZip?.replace(/\D/g, '') ?? null)}`,
      );

    if (sets.length > 0) {
      await this.drizzleService.getClient().execute(
        sql.raw(`
        UPDATE ${schema}.branches
        SET ${sets.join(', ')}
        WHERE id = ${idLiteral}
          AND deleted_at IS NULL
      `),
      );
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Updated branch could not be reloaded');
    }

    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);

    await this.drizzleService.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.branches
      SET deleted_at = NOW(), active = false
      WHERE id = ${idLiteral}
        AND deleted_at IS NULL
    `),
    );
  }

  async unlinkUser(branchId: string, userId: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const userLiteral = quoteLiteral(userId);

    await this.drizzleService.getClient().execute(
      sql.raw(`
      DELETE FROM ${schema}.user_branches
      WHERE branch_id = ${branchLiteral}
        AND user_id = ${userLiteral}
    `),
    );
  }

  async listUsers(branchId: string): Promise<Array<{ userId: string }>> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT user_id
      FROM ${schema}.user_branches
      WHERE branch_id = ${quoteLiteral(branchId)}
      ORDER BY user_id ASC
    `),
    );

    return result.rows.map((row) => ({
      userId: this.toText(row.user_id),
    }));
  }

  async assignUser(branchId: string, userId: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    await this.drizzleService.getClient().execute(
      sql.raw(`
      INSERT INTO ${schema}.user_branches (user_id, branch_id)
      VALUES (${quoteLiteral(userId)}, ${quoteLiteral(branchId)})
      ON CONFLICT (user_id, branch_id) DO NOTHING
    `),
    );
  }
}
