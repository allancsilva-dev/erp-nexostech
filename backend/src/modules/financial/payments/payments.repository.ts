import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';
import { PaymentEntity } from './dto/payment.response';
import { RegisterPaymentDto } from './dto/register-payment.dto';

export type EntryStub = {
  id: string;
  amount: string;
  remainingBalance: string;
  lastPaymentDate?: string;
};

/** Executor mínimo compatível com NodePgDatabase e com tx do drizzle.transaction() */
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

  /** Leitura simples (fora de transação) — usado apenas para listagem */
  async findEntryById(
    entryId: string,
    branchId: string,
  ): Promise<EntryStub | null> {
    return this._findEntry(
      entryId,
      branchId,
      this.drizzleService.getClient(),
      false,
    );
  }

  /**
   * SELECT … FOR UPDATE — trava a linha para a transação atual.
   * Deve ser chamado DENTRO de txHelper.run() para garantir isolamento.
   */
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
    const entry = quoteLiteral(entryId);
    const branch = quoteLiteral(branchId);
    const lock = forUpdate ? 'FOR UPDATE OF e' : '';

    const result = await executor.execute(
      sql.raw(`
      SELECT
        e.id,
        e.amount,
        (e.amount - COALESCE(SUM(p.amount), 0))::text AS remaining_balance,
        MAX(p.payment_date) AS last_payment_date
      FROM ${schema}.financial_entries e
      LEFT JOIN ${schema}.financial_entry_payments p ON p.entry_id = e.id
      WHERE e.id = ${entry}
        AND e.branch_id = ${branch}
        AND e.deleted_at IS NULL
      GROUP BY e.id, e.amount
      LIMIT 1
      ${lock}
    `),
    );

    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }

    return {
      id: this.toText(row.id),
      amount: this.toText(row.amount),
      remainingBalance: this.toText(row.remaining_balance),
      lastPaymentDate: this.toNullableText(row.last_payment_date) ?? undefined,
    };
  }

  async createPayment(
    entryId: string,
    dto: RegisterPaymentDto,
    userId: string,
    tx?: SqlExecutor,
  ): Promise<PaymentEntity> {
    const executor = tx ?? this.drizzleService.getClient();
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entry = quoteLiteral(entryId);
    const amount = quoteLiteral(dto.amount);
    const paymentDate = quoteLiteral(dto.paymentDate);
    const paymentMethod = quoteLiteral(dto.paymentMethod ?? null);
    const bankAccountId = quoteLiteral(dto.bankAccountId ?? null);
    const notes = quoteLiteral(dto.notes ?? null);
    const createdBy = quoteLiteral(userId);

    const result = await executor.execute(
      sql.raw(`
      INSERT INTO ${schema}.financial_entry_payments (
        entry_id, amount, payment_date, payment_method, bank_account_id, notes, created_by
      ) VALUES (
        ${entry}, ${amount}, ${paymentDate}, ${paymentMethod}, ${bankAccountId}, ${notes}, ${createdBy}
      )
      RETURNING id, entry_id, amount, payment_date, payment_method, bank_account_id, notes, created_by, created_at
    `),
    );

    const row = result.rows[0] as Record<string, unknown>;
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

  async listPaymentAmounts(
    entryId: string,
    tx?: SqlExecutor,
  ): Promise<string[]> {
    const executor = tx ?? this.drizzleService.getClient();
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entry = quoteLiteral(entryId);
    const result = await executor.execute(
      sql.raw(`
      SELECT amount
      FROM ${schema}.financial_entry_payments
      WHERE entry_id = ${entry}
      ORDER BY created_at ASC
    `),
    );

    return (result.rows as Array<Record<string, unknown>>).map((row) =>
      this.toText(row.amount),
    );
  }

  async removeLastPayment(
    entryId: string,
    tx?: SqlExecutor,
  ): Promise<PaymentEntity | null> {
    const executor = tx ?? this.drizzleService.getClient();
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entry = quoteLiteral(entryId);

    const result = await executor.execute(
      sql.raw(`
      DELETE FROM ${schema}.financial_entry_payments
      WHERE id = (
        SELECT id
        FROM ${schema}.financial_entry_payments
        WHERE entry_id = ${entry}
        ORDER BY created_at DESC
        LIMIT 1
      )
      RETURNING id, entry_id, amount, payment_date, payment_method, bank_account_id, notes, created_by, created_at
    `),
    );

    if (!result.rows.length) return null;
    const row = result.rows[0] as Record<string, unknown>;
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

  async updateEntryPaidStatus(
    entryId: string,
    status: 'PENDING' | 'PARTIAL' | 'PAID',
    tx?: SqlExecutor,
  ): Promise<void> {
    const executor = tx ?? this.drizzleService.getClient();
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entry = quoteLiteral(entryId);
    const statusLiteral = quoteLiteral(status);

    await executor.execute(
      sql.raw(`
      UPDATE ${schema}.financial_entries
      SET
        status = ${statusLiteral},
        paid_amount = (
          SELECT COALESCE(SUM(amount), 0)
          FROM ${schema}.financial_entry_payments
          WHERE entry_id = ${entry}
        ),
        paid_date = (
          SELECT MAX(payment_date)
          FROM ${schema}.financial_entry_payments
          WHERE entry_id = ${entry}
        ),
        updated_at = NOW()
      WHERE id = ${entry}
    `),
    );
  }

  async listByEntry(entryId: string): Promise<PaymentEntity[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entry = quoteLiteral(entryId);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, entry_id, amount, payment_date, payment_method, bank_account_id, notes, created_by, created_at
      FROM ${schema}.financial_entry_payments
      WHERE entry_id = ${entry}
      ORDER BY payment_date DESC, created_at DESC
    `),
    );

    return result.rows.map((row) => ({
      id: this.toText(row.id),
      entryId: this.toText(row.entry_id),
      amount: this.toText(row.amount),
      paymentDate: this.toText(row.payment_date),
      paymentMethod: this.toNullableText(row.payment_method),
      bankAccountId: this.toNullableText(row.bank_account_id),
      notes: this.toNullableText(row.notes),
      createdBy: this.toText(row.created_by),
      createdAt: new Date(this.toText(row.created_at)).toISOString(),
    }));
  }
}
