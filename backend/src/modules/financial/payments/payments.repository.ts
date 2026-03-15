import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { quoteIdent, quoteLiteral } from '../../../infrastructure/database/sql-builder.util';
import { PaymentEntity } from './dto/payment.response';
import { RegisterPaymentDto } from './dto/register-payment.dto';

type EntryStub = {
  id: string;
  amount: string;
  remainingBalance: string;
  lastPaymentDate?: string;
};

@Injectable()
export class PaymentsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findEntryById(entryId: string, branchId: string): Promise<EntryStub | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entry = quoteLiteral(entryId);
    const branch = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
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
    `));

    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      amount: String(row.amount),
      remainingBalance: String(row.remaining_balance),
      lastPaymentDate: row.last_payment_date ? String(row.last_payment_date) : undefined,
    };
  }

  async createPayment(entryId: string, dto: RegisterPaymentDto, userId: string): Promise<PaymentEntity> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entry = quoteLiteral(entryId);
    const amount = quoteLiteral(dto.amount);
    const paymentDate = quoteLiteral(dto.paymentDate);
    const paymentMethod = quoteLiteral(dto.paymentMethod ?? null);
    const bankAccountId = quoteLiteral(dto.bankAccountId ?? null);
    const notes = quoteLiteral(dto.notes ?? null);
    const createdBy = quoteLiteral(userId);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      INSERT INTO ${schema}.financial_entry_payments (
        entry_id, amount, payment_date, payment_method, bank_account_id, notes, created_by
      ) VALUES (
        ${entry}, ${amount}, ${paymentDate}, ${paymentMethod}, ${bankAccountId}, ${notes}, ${createdBy}
      )
      RETURNING id, entry_id, amount, payment_date, payment_method, bank_account_id, notes, created_by, created_at
    `));

    const row = result.rows[0] as Record<string, unknown>;
    return {
      id: String(row.id),
      entryId: String(row.entry_id),
      amount: String(row.amount),
      paymentDate: String(row.payment_date),
      paymentMethod: row.payment_method ? String(row.payment_method) : null,
      bankAccountId: row.bank_account_id ? String(row.bank_account_id) : null,
      notes: row.notes ? String(row.notes) : null,
      createdBy: String(row.created_by),
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  }

  async listPaymentAmounts(entryId: string): Promise<string[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entry = quoteLiteral(entryId);
    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT amount
      FROM ${schema}.financial_entry_payments
      WHERE entry_id = ${entry}
      ORDER BY created_at ASC
    `));

    return (result.rows as Array<Record<string, unknown>>).map((row) => String(row.amount));
  }

  async removeLastPayment(entryId: string): Promise<PaymentEntity | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entry = quoteLiteral(entryId);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      DELETE FROM ${schema}.financial_entry_payments
      WHERE id = (
        SELECT id
        FROM ${schema}.financial_entry_payments
        WHERE entry_id = ${entry}
        ORDER BY created_at DESC
        LIMIT 1
      )
      RETURNING id, entry_id, amount, payment_date, payment_method, bank_account_id, notes, created_by, created_at
    `));

    if (!result.rows.length) return null;
    const row = result.rows[0] as Record<string, unknown>;
    return {
      id: String(row.id),
      entryId: String(row.entry_id),
      amount: String(row.amount),
      paymentDate: String(row.payment_date),
      paymentMethod: row.payment_method ? String(row.payment_method) : null,
      bankAccountId: row.bank_account_id ? String(row.bank_account_id) : null,
      notes: row.notes ? String(row.notes) : null,
      createdBy: String(row.created_by),
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  }

  async updateEntryPaidStatus(entryId: string, status: 'PENDING' | 'PARTIAL' | 'PAID'): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entry = quoteLiteral(entryId);
    const statusLiteral = quoteLiteral(status);

    await this.drizzleService.getClient().execute(sql.raw(`
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
    `));
  }

  async listByEntry(entryId: string): Promise<PaymentEntity[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entry = quoteLiteral(entryId);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT id, entry_id, amount, payment_date, payment_method, bank_account_id, notes, created_by, created_at
      FROM ${schema}.financial_entry_payments
      WHERE entry_id = ${entry}
      ORDER BY payment_date DESC, created_at DESC
    `));

    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      entryId: String(row.entry_id),
      amount: String(row.amount),
      paymentDate: String(row.payment_date),
      paymentMethod: row.payment_method ? String(row.payment_method) : null,
      bankAccountId: row.bank_account_id ? String(row.bank_account_id) : null,
      notes: row.notes ? String(row.notes) : null,
      createdBy: String(row.created_by),
      createdAt: new Date(String(row.created_at)).toISOString(),
    }));
  }
}
