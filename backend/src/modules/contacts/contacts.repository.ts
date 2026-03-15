import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import { quoteIdent, quoteLiteral } from '../../infrastructure/database/sql-builder.util';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactEntity } from './dto/contact.response';

@Injectable()
export class ContactsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private mapRow(row: Record<string, unknown>): ContactEntity {
    return {
      id: String(row.id),
      name: String(row.name),
      type: String(row.type),
      document: row.document ? String(row.document) : null,
      phone: row.phone ? String(row.phone) : null,
      email: row.email ? String(row.email) : null,
      active: Boolean(row.active),
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  }

  async list(page: number, pageSize: number): Promise<{ items: ContactEntity[]; total: number }> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const offset = (page - 1) * pageSize;

    const rowsResult = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT id, name, type, document, phone, email, active, created_at
      FROM ${schema}.contacts
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `));

    const countResult = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT COUNT(*)::int AS total
      FROM ${schema}.contacts
      WHERE deleted_at IS NULL
    `));

    const items = (rowsResult.rows as Array<Record<string, unknown>>).map((row) => this.mapRow(row));

    const total = Number((countResult.rows[0] as Record<string, unknown>)?.total ?? 0);
    return { items, total };
  }

  async create(dto: CreateContactDto): Promise<ContactEntity> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const name = quoteLiteral(dto.name);
    const type = quoteLiteral(dto.type);
    const document = quoteLiteral(dto.document ?? null);
    const phone = quoteLiteral(dto.phone ?? null);
    const email = quoteLiteral(dto.email ?? null);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      INSERT INTO ${schema}.contacts (name, type, document, phone, email, active)
      VALUES (${name}, ${type}, ${document}, ${phone}, ${email}, true)
      RETURNING id, name, type, document, phone, email, active, created_at
    `));

    return this.mapRow(result.rows[0] as Record<string, unknown>);
  }

  async findById(id: string): Promise<ContactEntity | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT id, name, type, document, phone, email, active, created_at
      FROM ${schema}.contacts
      WHERE id = ${idLiteral}
        AND deleted_at IS NULL
      LIMIT 1
    `));

    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  async update(id: string, dto: { name?: string; type?: string; document?: string; phone?: string; email?: string }): Promise<ContactEntity> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const sets: string[] = [];

    if (dto.name !== undefined) sets.push(`name = ${quoteLiteral(dto.name)}`);
    if (dto.type !== undefined) sets.push(`type = ${quoteLiteral(dto.type)}`);
    if (dto.document !== undefined) sets.push(`document = ${quoteLiteral(dto.document)}`);
    if (dto.phone !== undefined) sets.push(`phone = ${quoteLiteral(dto.phone)}`);
    if (dto.email !== undefined) sets.push(`email = ${quoteLiteral(dto.email)}`);

    if (sets.length > 0) {
      await this.drizzleService.getClient().execute(sql.raw(`
        UPDATE ${schema}.contacts
        SET ${sets.join(', ')}
        WHERE id = ${idLiteral}
          AND deleted_at IS NULL
      `));
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Updated contact could not be reloaded');
    }

    return updated;
  }
}
