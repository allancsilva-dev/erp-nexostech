import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactEntity } from './dto/contact.response';

@Injectable()
export class ContactsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private escapeLiteral(value: string | null): string {
    if (value === null) return 'NULL';
    return `'${value.replace(/'/g, "''")}'`;
  }

  async list(page: number, pageSize: number): Promise<{ items: ContactEntity[]; total: number }> {
    const schema = this.drizzleService.getTenantSchema();
    const offset = (page - 1) * pageSize;

    const rowsResult = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT id, name, type, document, phone, email, active, created_at
      FROM "${schema}".contacts
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `));

    const countResult = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT COUNT(*)::int AS total
      FROM "${schema}".contacts
      WHERE deleted_at IS NULL
    `));

    const items = (rowsResult.rows as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      type: String(row.type),
      document: row.document ? String(row.document) : null,
      phone: row.phone ? String(row.phone) : null,
      email: row.email ? String(row.email) : null,
      active: Boolean(row.active),
      createdAt: new Date(String(row.created_at)).toISOString(),
    }));

    const total = Number((countResult.rows[0] as Record<string, unknown>)?.total ?? 0);
    return { items, total };
  }

  async create(dto: CreateContactDto): Promise<ContactEntity> {
    const schema = this.drizzleService.getTenantSchema();
    const name = this.escapeLiteral(dto.name);
    const type = this.escapeLiteral(dto.type);
    const document = this.escapeLiteral(dto.document ?? null);
    const phone = this.escapeLiteral(dto.phone ?? null);
    const email = this.escapeLiteral(dto.email ?? null);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      INSERT INTO "${schema}".contacts (name, type, document, phone, email, active)
      VALUES (${name}, ${type}, ${document}, ${phone}, ${email}, true)
      RETURNING id, name, type, document, phone, email, active, created_at
    `));

    const row = result.rows[0] as Record<string, unknown>;
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
}
