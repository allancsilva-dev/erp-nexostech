import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';

@Injectable()
export class ApprovalsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async listPending(branchId: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT
        e.id AS entry_id,
        e.document_number,
        e.description,
        e.amount,
        e.due_date,
        e.status,
        c.name AS category_name,
        ct.name AS contact_name
      FROM ${schema}.financial_entries e
      LEFT JOIN ${schema}.categories c ON c.id = e.category_id
      LEFT JOIN ${schema}.contacts ct ON ct.id = e.contact_id
      WHERE e.branch_id = ${branchLiteral}
        AND e.status = 'PENDING_APPROVAL'
        AND e.deleted_at IS NULL
      ORDER BY e.due_date ASC, e.created_at ASC
    `),
    );

    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
      entryId: String(row.entry_id),
      documentNumber: String(row.document_number),
      description: String(row.description),
      amount: String(row.amount),
      dueDate: String(row.due_date),
      status: String(row.status),
      categoryName: row.category_name ? String(row.category_name) : null,
      contactName: row.contact_name ? String(row.contact_name) : null,
    }));
  }

  async findEntryCreator(
    entryId: string,
    branchId: string,
  ): Promise<{ createdBy: string } | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT created_by
      FROM ${schema}.financial_entries
      WHERE id = ${quoteLiteral(entryId)}
        AND branch_id = ${quoteLiteral(branchId)}
        AND deleted_at IS NULL
      LIMIT 1
    `),
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? { createdBy: String(row.created_by) } : null;
  }

  async createApprovalRecord(
    entryId: string,
    branchId: string,
    userId: string,
    action: 'APPROVED' | 'REJECTED',
    notes?: string,
  ) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entryLiteral = quoteLiteral(entryId);
    const branchLiteral = quoteLiteral(branchId);
    const userLiteral = quoteLiteral(userId);
    const actionLiteral = quoteLiteral(action);
    const notesLiteral = quoteLiteral(notes ?? null);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      INSERT INTO ${schema}.entry_approvals (
        entry_id, branch_id, approved_by, action, notes
      ) VALUES (
        ${entryLiteral}, ${branchLiteral}, ${userLiteral}, ${actionLiteral}, ${notesLiteral}
      )
      RETURNING id, entry_id, approved_by, action, notes, created_at
    `),
    );

    const nextStatus = action === 'APPROVED' ? 'PENDING' : 'CANCELLED';
    await this.drizzleService.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.financial_entries
      SET status = ${quoteLiteral(nextStatus)}
      WHERE id = ${entryLiteral}
        AND branch_id = ${branchLiteral}
        AND deleted_at IS NULL
    `),
    );

    const row = result.rows[0] as Record<string, unknown>;
    return {
      id: String(row.id),
      entryId: String(row.entry_id),
      userId: String(row.approved_by),
      action: String(row.action),
      notes: row.notes ? String(row.notes) : null,
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  }

  async history(branchId: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, entry_id, approved_by, action, notes, created_at
      FROM ${schema}.entry_approvals
      WHERE branch_id = ${branchLiteral}
      ORDER BY created_at DESC
      LIMIT 300
    `),
    );

    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      entryId: String(row.entry_id),
      userId: String(row.approved_by),
      action: String(row.action),
      notes: row.notes ? String(row.notes) : null,
      createdAt: new Date(String(row.created_at)).toISOString(),
    }));
  }
}
