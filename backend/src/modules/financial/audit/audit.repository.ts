import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { quoteIdent, quoteLiteral } from '../../../infrastructure/database/sql-builder.util';

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

  async list(page: number, pageSize: number): Promise<{ items: AuditLogEntity[]; total: number }> {
    const safePage = Math.max(page, 1);
    const safePageSize = Math.max(pageSize, 1);
    const offset = (safePage - 1) * safePageSize;
    const schema = quoteIdent(this.drizzleService.getTenantSchema());

    const totalResult = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT COUNT(*)::int AS total
      FROM ${schema}.audit_logs
    `));

    const rowsResult = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT id, branch_id, user_id, user_email, action, entity, entity_id, request_id, ip_address, field_changes, created_at
      FROM ${schema}.audit_logs
      ORDER BY created_at DESC
      LIMIT ${safePageSize}
      OFFSET ${offset}
    `));

    const totalRow = totalResult.rows[0] as Record<string, unknown> | undefined;
    const items = (rowsResult.rows as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      branchId: row.branch_id ? String(row.branch_id) : null,
      userId: String(row.user_id),
      userEmail: row.user_email ? String(row.user_email) : null,
      action: String(row.action),
      entity: String(row.entity),
      entityId: String(row.entity_id),
      requestId: row.request_id ? String(row.request_id) : null,
      ipAddress: row.ip_address ? String(row.ip_address) : null,
      fieldChanges: Array.isArray(row.field_changes) ? (row.field_changes as unknown[]) : [],
      createdAt: new Date(String(row.created_at)).toISOString(),
    }));

    return {
      items,
      total: totalRow?.total ? Number(totalRow.total) : 0,
    };
  }

  async getById(id: string): Promise<AuditLogEntity | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT id, branch_id, user_id, user_email, action, entity, entity_id, request_id, ip_address, field_changes, created_at
      FROM ${schema}.audit_logs
      WHERE id = ${quoteLiteral(id)}
      LIMIT 1
    `));

    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      branchId: row.branch_id ? String(row.branch_id) : null,
      userId: String(row.user_id),
      userEmail: row.user_email ? String(row.user_email) : null,
      action: String(row.action),
      entity: String(row.entity),
      entityId: String(row.entity_id),
      requestId: row.request_id ? String(row.request_id) : null,
      ipAddress: row.ip_address ? String(row.ip_address) : null,
      fieldChanges: Array.isArray(row.field_changes) ? (row.field_changes as unknown[]) : [],
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  }
}
