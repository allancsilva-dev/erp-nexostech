import { HttpStatus, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';

type DrizzleTransaction = Parameters<
  Parameters<DrizzleService['transaction']>[0]
>[0];

@Injectable()
export class ApprovalsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private toText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'bigint')
      return String(value);
    return '';
  }

  private toNullableText(value: unknown): string | null {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'bigint')
      return String(value);
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
      documentNumber: this.toNullableText(row.document_number),
      description: this.toText(row.description),
      amount: this.toText(row.amount),
      dueDate: this.toText(row.due_date),
      status: this.toText(row.status),
      categoryName: this.toNullableText(row.category_name),
      contactName: this.toNullableText(row.contact_name),
    }));
  }

  async findEntryForApproval(
    entryId: string,
    branchId: string,
  ): Promise<{
    status: string;
    createdBy: string;
    documentNumber: string | null;
    amount: string;
    type: string;
  } | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
        SELECT status, created_by, document_number, amount::text AS amount, type
        FROM ${schema}.financial_entries
        WHERE id = ${quoteLiteral(entryId)}
          AND branch_id = ${quoteLiteral(branchId)}
          AND deleted_at IS NULL
        LIMIT 1
      `),
    );

    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      status: this.toText(row.status),
      createdBy: this.toText(row.created_by),
      documentNumber: this.toNullableText(row.document_number),
      amount: this.toText(row.amount),
      type: this.toText(row.type),
    };
  }

  async createApprovalRecord(
    entryId: string,
    branchId: string,
    userId: string,
    action: 'APPROVED' | 'REJECTED',
    notes?: string,
    entryType?: string,
    tx?: DrizzleTransaction,
  ) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entryLiteral = quoteLiteral(entryId);
    const branchLiteral = quoteLiteral(branchId);
    const runInTransaction = async (executor: DrizzleTransaction) => {
      const insertRes = await executor.execute(
        sql.raw(`
          INSERT INTO ${schema}.entry_approvals (
            entry_id, branch_id, approved_by, action, notes
          ) VALUES (
            ${entryLiteral}, ${branchLiteral},
            ${quoteLiteral(userId)}, ${quoteLiteral(action)}, ${quoteLiteral(notes ?? null)}
          )
          RETURNING id, entry_id, approved_by, action, notes, created_at
        `),
      );

      if (action === 'APPROVED') {
        const prefix =
          (entryType ?? 'RECEIVABLE') === 'PAYABLE' ? 'PAY' : 'REC';
        const year = new Date().getFullYear();

        const seqRes: unknown = await executor.execute(
          sql.raw(`
            INSERT INTO ${schema}.document_sequences (branch_id, type, year, last_sequence)
            VALUES (${branchLiteral}, ${quoteLiteral(prefix)}, ${year}, 1)
            ON CONFLICT (branch_id, type, year)
            DO UPDATE SET
              last_sequence = ${schema}.document_sequences.last_sequence + 1,
              updated_at = NOW()
            RETURNING last_sequence
          `),
        );

        const seqRows = Array.isArray((seqRes as { rows?: unknown[] })?.rows)
          ? (seqRes as { rows: Array<Record<string, unknown>> }).rows
          : [];
        const nextSeq = Number(seqRows[0]?.last_sequence ?? 1);
        const documentNumber = `${prefix}-${year}-${String(nextSeq).padStart(5, '0')}`;

        const updateResult = await executor.execute(
          sql.raw(`
            UPDATE ${schema}.financial_entries
            SET status = 'PENDING', document_number = ${quoteLiteral(documentNumber)}, updated_at = NOW()
            WHERE id = ${entryLiteral}
              AND branch_id = ${branchLiteral}
              AND status = 'PENDING_APPROVAL'
              AND deleted_at IS NULL
            RETURNING id
          `),
        );

        if (updateResult.rows.length === 0) {
          throw new BusinessException(
            'APPROVAL_ALREADY_PROCESSED',
            HttpStatus.CONFLICT,
          );
        }
      } else {
        const updateResult = await executor.execute(
          sql.raw(`
            UPDATE ${schema}.financial_entries
            SET status = 'CANCELLED', updated_at = NOW()
            WHERE id = ${entryLiteral}
              AND branch_id = ${branchLiteral}
              AND status = 'PENDING_APPROVAL'
              AND deleted_at IS NULL
            RETURNING id
          `),
        );

        if (updateResult.rows.length === 0) {
          throw new BusinessException(
            'APPROVAL_ALREADY_PROCESSED',
            HttpStatus.CONFLICT,
          );
        }
      }

      return insertRes;
    };

    const result = tx
      ? await runInTransaction(tx)
      : await this.drizzleService.transaction(async (transactionTx) =>
          runInTransaction(transactionTx),
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
