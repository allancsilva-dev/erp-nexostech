import { HttpStatus, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';

type QueryRow = Record<string, unknown>;
type SqlExecutor = { execute(query: any): Promise<{ rows: unknown[] }> };

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

@Injectable()
export class ReconciliationRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findActiveBankAccount(
    accountId: string,
    branchId: string,
  ): Promise<{ id: string; branchId: string } | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
        SELECT id, branch_id
        FROM ${schema}.bank_accounts
        WHERE id = ${quoteLiteral(accountId)}
          AND branch_id = ${quoteLiteral(branchId)}
          AND active = true
          AND deleted_at IS NULL
        LIMIT 1
      `),
    );
    const row = getRows(result)[0];
    return row ? { id: toText(row.id), branchId: toText(row.branch_id) } : null;
  }

  async findItemById(
    itemId: string,
    branchId: string,
  ): Promise<{ id: string; reconciled: boolean; entryId: string } | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
        SELECT id, reconciled, entry_id
        FROM ${schema}.reconciliation_items
        WHERE id = ${quoteLiteral(itemId)}
          AND branch_id = ${quoteLiteral(branchId)}
          AND deleted_at IS NULL
        LIMIT 1
      `),
    );
    const row = getRows(result)[0];
    return row
      ? {
          id: toText(row.id),
          reconciled: Boolean(row.reconciled),
          entryId: toText(row.entry_id),
        }
      : null;
  }

  async entryBelongsToBranch(entryId: string, branchId: string): Promise<boolean> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
        SELECT 1
        FROM ${schema}.financial_entries
        WHERE id = ${quoteLiteral(entryId)}
          AND branch_id = ${quoteLiteral(branchId)}
          AND deleted_at IS NULL
        LIMIT 1
      `),
    );
    return getRows(result).length > 0;
  }

  async listPending(branchId: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT
        i.id,
        i.batch_id,
        i.payment_id,
        i.entry_id,
        i.amount,
        i.payment_date,
        i.reconciled,
        b.created_at AS batch_created_at
      FROM ${schema}.reconciliation_items i
      JOIN ${schema}.reconciliation_batches b ON b.id = i.batch_id
      WHERE i.branch_id = ${quoteLiteral(branchId)}
        AND i.deleted_at IS NULL
        AND i.reconciled = false
      ORDER BY i.payment_date DESC
      LIMIT 100
    `),
    );

    return getRows(result).map((row) => ({
      id: toText(row.id),
      batchId: toText(row.batch_id),
      paymentId: toText(row.payment_id),
      entryId: toText(row.entry_id),
      amount: toText(row.amount),
      paymentDate: toText(row.payment_date),
      reconciled: Boolean(row.reconciled),
      batchCreatedAt: new Date(toText(row.batch_created_at)).toISOString(),
    }));
  }

  async createBatch(
    branchId: string,
    createdBy: string,
    bankAccountId: string,
    startDate: string,
    endDate: string,
    tx?: SqlExecutor,
  ) {
    const executor = tx ?? this.drizzleService.getClient();
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result: unknown = await executor.execute(
      sql.raw(`
      INSERT INTO ${schema}.reconciliation_batches (
        branch_id, bank_account_id, start_date, end_date, created_by
      ) VALUES (
        ${quoteLiteral(branchId)},
        ${quoteLiteral(bankAccountId)},
        ${quoteLiteral(startDate)},
        ${quoteLiteral(endDate)},
        ${quoteLiteral(createdBy)}
      )
      RETURNING id, branch_id, bank_account_id, start_date, end_date, created_by, created_at
    `),
    );

    const row = getRows(result)[0];
    if (!row) {
      // TODO: mover esta regra de negocio para a camada de service (refactor futuro)
      throw new BusinessException(
        'INTERNAL_ERROR',
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          branchId,
          bankAccountId,
          startDate,
          endDate,
          operation: 'CREATE_RECONCILIATION_BATCH',
        },
      );
    }

    return {
      id: toText(row.id),
      branchId: toText(row.branch_id),
      bankAccountId: toText(row.bank_account_id),
      startDate: toText(row.start_date),
      endDate: toText(row.end_date),
      createdBy: toText(row.created_by),
      createdAt: new Date(toText(row.created_at)).toISOString(),
    };
  }

  async importFromPayments(
    batchId: string,
    branchId: string,
    bankAccountId: string,
    startDate: string,
    endDate: string,
    tx?: SqlExecutor,
  ): Promise<number> {
    const executor = tx ?? this.drizzleService.getClient();
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result: unknown = await executor.execute(
      sql.raw(`
      INSERT INTO ${schema}.reconciliation_items (
        batch_id, branch_id, payment_id, entry_id, amount, payment_date, reconciled
      )
      SELECT
        ${quoteLiteral(batchId)},
        ${quoteLiteral(branchId)},
        p.id,
        p.entry_id,
        p.amount,
        p.payment_date,
        false
      FROM ${schema}.financial_entry_payments p
      JOIN ${schema}.financial_entries e ON e.id = p.entry_id
      WHERE e.branch_id = ${quoteLiteral(branchId)}
        AND p.bank_account_id = ${quoteLiteral(bankAccountId)}
        AND p.payment_date >= ${quoteLiteral(startDate)}
        AND p.payment_date <= ${quoteLiteral(endDate)}
      ON CONFLICT (batch_id, payment_id)
      DO NOTHING
      RETURNING id
    `),
    );

    return getRows(result).length;
  }

  async undoBatch(batchId: string, branchId: string, tx?: SqlExecutor): Promise<void> {
    const executor = tx ?? this.drizzleService.getClient();
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    await executor.execute(
      sql.raw(`
      UPDATE ${schema}.reconciliation_items
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE batch_id = ${quoteLiteral(batchId)}
        AND branch_id = ${quoteLiteral(branchId)}
        AND deleted_at IS NULL
    `),
    );

    await executor.execute(
      sql.raw(`
      UPDATE ${schema}.reconciliation_batches
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ${quoteLiteral(batchId)}
        AND branch_id = ${quoteLiteral(branchId)}
        AND deleted_at IS NULL
    `),
    );
  }

  async getBatchItems(batchId: string, branchId: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT
        id,
        batch_id,
        payment_id,
        entry_id,
        amount,
        payment_date,
        reconciled,
        created_at
      FROM ${schema}.reconciliation_items
      WHERE batch_id = ${quoteLiteral(batchId)}
        AND branch_id = ${quoteLiteral(branchId)}
        AND deleted_at IS NULL
      ORDER BY payment_date DESC, created_at DESC
    `),
    );

    return getRows(result).map((row) => ({
      id: toText(row.id),
      batchId: toText(row.batch_id),
      paymentId: toText(row.payment_id),
      entryId: toText(row.entry_id),
      amount: toText(row.amount),
      paymentDate: toText(row.payment_date),
      reconciled: Boolean(row.reconciled),
      createdAt: new Date(toText(row.created_at)).toISOString(),
    }));
  }

  async matchItem(
    itemId: string,
    entryId: string | undefined,
    branchId: string,
    tx?: SqlExecutor,
  ) {
    const executor = tx ?? this.drizzleService.getClient();
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entryClause =
      entryId !== undefined ? `entry_id = ${quoteLiteral(entryId)},` : '';

    const result: unknown = await executor.execute(
      sql.raw(`
      UPDATE ${schema}.reconciliation_items
      SET ${entryClause}
          reconciled = true,
          updated_at = NOW()
      WHERE id = ${quoteLiteral(itemId)}
        AND branch_id = ${quoteLiteral(branchId)}
        AND reconciled = false
        AND deleted_at IS NULL
      RETURNING id, batch_id, payment_id, entry_id, amount, payment_date, reconciled, updated_at
    `),
    );

    const row = getRows(result)[0];
    if (!row) {
      throw new BusinessException(
        'RECONCILIATION_ITEM_ALREADY_MATCHED',
        HttpStatus.CONFLICT,
        { itemId },
      );
    }

    return {
      id: toText(row.id),
      batchId: toText(row.batch_id),
      paymentId: toText(row.payment_id),
      entryId: toText(row.entry_id),
      amount: toText(row.amount),
      paymentDate: toText(row.payment_date),
      reconciled: Boolean(row.reconciled),
      updatedAt: new Date(toText(row.updated_at)).toISOString(),
    };
  }
}
