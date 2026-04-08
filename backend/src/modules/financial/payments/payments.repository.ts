import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';
import { PaymentEntity } from './dto/payment.response';
import Decimal from 'decimal.js';
import { RegisterPaymentDto } from './dto/register-payment.dto';

export type EntryStub = {
  id: string;
  amount: string;
  status: string;
  type: string;
  branchId: string;
  remainingBalance: string;
  lastPaymentDate: string | null;
};

type SqlExecutor = {
  execute(query: any): Promise<{ rows: unknown[] }>;
};

@Injectable()
export class PaymentsRepository {
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

  async findEntryById(
    entryId: string,
    branchId: string,
  ): Promise<EntryStub | null> {
    return this._findEntry(entryId, branchId, this.drizzleService.getClient(), false);
  }

  async findEntryByIdForUpdate(
    entryId: string,
    branchId: string,
    tx: SqlExecutor,
  ): Promise<EntryStub | null> {
    return this._findEntry(entryId, branchId, tx, true);
  }

  private async _findEntry(
    entryId: string,
    branchId: string,
    executor: SqlExecutor,
    forUpdate: boolean,
  ): Promise<EntryStub | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entryLit = quoteLiteral(entryId);
    const branch = quoteLiteral(branchId);
    const lock = forUpdate ? 'FOR UPDATE' : '';

    const entryResult = await executor.execute(
      sql.raw(`
        SELECT id, amount, status, type, branch_id
        FROM ${schema}.financial_entries
        WHERE id = ${entryLit}
          AND branch_id = ${branch}
          AND deleted_at IS NULL
        LIMIT 1
        ${lock}
      `),
    );

    const entryRow = entryResult.rows[0] as Record<string, unknown> | undefined;
    if (!entryRow) return null;

    const paymentsResult = await executor.execute(
      sql.raw(`
        SELECT COALESCE(SUM(amount), 0)::text AS total_paid, MAX(payment_date) AS last_payment_date
        FROM ${schema}.financial_entry_payments
        WHERE entry_id = ${entryLit}
      `),
    );

    const paymentsRow = paymentsResult.rows[0] as Record<string, unknown> | undefined;
    const totalPaidText = this.toText(paymentsRow?.total_paid ?? '0');
    const remaining = new Decimal(this.toText(entryRow.amount)).minus(new Decimal(totalPaidText));

    return {
      id: this.toText(entryRow.id),
      amount: this.toText(entryRow.amount),
      status: this.toText(entryRow.status),
      type: this.toText(entryRow.type),
      branchId: this.toText(entryRow.branch_id),
      remainingBalance: remaining.toFixed(2),
      lastPaymentDate: this.toNullableText(paymentsRow?.last_payment_date) ?? null,
    };
  }

  async findPaymentById(
    paymentId: string,
    branchId: string,
    tx?: SqlExecutor,
  ): Promise<PaymentEntity | null> {
    const executor = tx ?? this.drizzleService.getClient();
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const forUpdate = tx ? 'FOR UPDATE' : '';

    const result = await executor.execute(
      sql.raw(`
        SELECT p.id, p.entry_id, p.amount, p.payment_date,
               p.payment_method, p.bank_account_id, p.notes,
               p.created_by, p.created_at
        FROM ${schema}.financial_entry_payments p
        INNER JOIN ${schema}.financial_entries e ON e.id = p.entry_id
        WHERE p.id = ${quoteLiteral(paymentId)}::uuid
          AND e.branch_id = ${quoteLiteral(branchId)}::uuid
          AND e.deleted_at IS NULL
        LIMIT 1
        ${forUpdate}
      `),
    );

    if (!result.rows.length) return null;
    return this._mapPayment(result.rows[0] as Record<string, unknown>);
  }

  async createPayment(
    entryId: string,
    dto: RegisterPaymentDto,
    userId: string,
    tx?: SqlExecutor,
  ): Promise<PaymentEntity> {
    const executor = tx ?? this.drizzleService.getClient();
    const schema = quoteIdent(this.drizzleService.getTenantSchema());

    const result = await executor.execute(
      sql.raw(`
        INSERT INTO ${schema}.financial_entry_payments (
          entry_id, amount, payment_date, payment_method, bank_account_id, notes, created_by
        ) VALUES (
          ${quoteLiteral(entryId)},
          ${quoteLiteral(dto.amount)},
          ${quoteLiteral(dto.paymentDate)},
          ${quoteLiteral(dto.paymentMethod ?? null)},
          ${quoteLiteral(dto.bankAccountId ?? null)},
          ${quoteLiteral(dto.notes ?? null)},
          ${quoteLiteral(userId)}
        )
        RETURNING id, entry_id, amount, payment_date, payment_method,
                  bank_account_id, notes, created_by, created_at
      `),
    );

    return this._mapPayment(result.rows[0] as Record<string, unknown>);
  }

  async listPaymentAmounts(
    entryId: string,
    tx?: SqlExecutor,
  ): Promise<string[]> {
    const executor = tx ?? this.drizzleService.getClient();
    const schema = quoteIdent(this.drizzleService.getTenantSchema());

    const result = await executor.execute(
      sql.raw(`
        SELECT amount
        FROM ${schema}.financial_entry_payments
        WHERE entry_id = ${quoteLiteral(entryId)}
        ORDER BY created_at ASC
      `),
    );

    return (result.rows as Array<Record<string, unknown>>).map((row) =>
      this.toText(row.amount),
    );
  }

  async removePaymentById(
    paymentId: string,
    tx: SqlExecutor,
  ): Promise<PaymentEntity | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());

    const result = await tx.execute(
      sql.raw(`
        DELETE FROM ${schema}.financial_entry_payments
        WHERE id = ${quoteLiteral(paymentId)}::uuid
        RETURNING id, entry_id, amount, payment_date, payment_method,
                  bank_account_id, notes, created_by, created_at
      `),
    );

    if (!result.rows.length) return null;
    return this._mapPayment(result.rows[0] as Record<string, unknown>);
  }

  async updateEntryPaidStatus(
    entryId: string,
    status: 'PENDING' | 'PARTIAL' | 'PAID',
    tx?: SqlExecutor,
  ): Promise<void> {
    const executor = tx ?? this.drizzleService.getClient();
    const schema = quoteIdent(this.drizzleService.getTenantSchema());

    await executor.execute(
      sql.raw(`
        UPDATE ${schema}.financial_entries
        SET
          status = ${quoteLiteral(status)},
          paid_amount = (
            SELECT COALESCE(SUM(amount), 0)
            FROM ${schema}.financial_entry_payments
            WHERE entry_id = ${quoteLiteral(entryId)}
          ),
          paid_date = (
            SELECT MAX(payment_date)
            FROM ${schema}.financial_entry_payments
            WHERE entry_id = ${quoteLiteral(entryId)}
          ),
          updated_at = NOW()
        WHERE id = ${quoteLiteral(entryId)}
      `),
    );
  }

  async listByEntry(entryId: string): Promise<PaymentEntity[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
        SELECT id, entry_id, amount, payment_date, payment_method,
               bank_account_id, notes, created_by, created_at
        FROM ${schema}.financial_entry_payments
        WHERE entry_id = ${quoteLiteral(entryId)}
        ORDER BY payment_date DESC, created_at DESC
      `),
    );

    return (result.rows as Array<Record<string, unknown>>).map((row) =>
      this._mapPayment(row),
    );
  }

  private _mapPayment(row: Record<string, unknown>): PaymentEntity {
    return {
      id: this.toText(row.id),
      entryId: this.toText(row.entry_id),
      amount: this.toText(row.amount),
      paymentDate: this.toText(row.payment_date),
      paymentMethod: this.toNullableText(row.payment_method),
      bankAccountId: this.toNullableText(row.bank_account_id),
      notes: this.toNullableText(row.notes),
      createdBy: this.toText(row.created_by),
      createdAt: new Date(this.toText(row.created_at)).toISOString(),
    };
  }
}
