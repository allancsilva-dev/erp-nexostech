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

    return result.rows.map((row) => ({
      entryId: this.toText(row.entry_id),
      documentNumber: this.toText(row.document_number),
      description: this.toText(row.description),
      amount: this.toText(row.amount),
      dueDate: this.toText(row.due_date),
      status: this.toText(row.status),
      categoryName: this.toNullableText(row.category_name),
      contactName: this.toNullableText(row.contact_name),
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
    return row ? { createdBy: this.toText(row.created_by) } : null;
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

    const row = result.rows[0];
    return {
      id: this.toText(row.id),
      entryId: this.toText(row.entry_id),
      userId: this.toText(row.approved_by),
      action: this.toText(row.action),
      notes: this.toNullableText(row.notes),
      createdAt: new Date(this.toText(row.created_at)).toISOString(),
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

    return result.rows.map((row) => ({
      id: this.toText(row.id),
      entryId: this.toText(row.entry_id),
      userId: this.toText(row.approved_by),
      action: this.toText(row.action),
      notes: this.toNullableText(row.notes),
      createdAt: new Date(this.toText(row.created_at)).toISOString(),
    }));
  }
}
