import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';

export type DashboardSummary = {
  currentBalance: string;
  totalReceivable30d: string;
  totalPayable30d: string;
  monthResult: string;
};

@Injectable()
export class DashboardRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private toNullableText(value: unknown): string | null {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }
    return null;
  }

  private toText(value: unknown): string {
    return this.toNullableText(value) ?? '';
  }

  async getSummary(branchId: string): Promise<DashboardSummary> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT
        COALESCE((SELECT SUM(initial_balance) FROM ${schema}.bank_accounts
                  WHERE branch_id = ${branchLiteral} AND deleted_at IS NULL), 0)::text AS current_balance,
        COALESCE((SELECT SUM(amount) FROM ${schema}.financial_entries
                  WHERE branch_id = ${branchLiteral}
                    AND type = 'RECEIVABLE'
                    AND due_date >= CURRENT_DATE
                    AND due_date <= CURRENT_DATE + INTERVAL '30 days'
                    AND deleted_at IS NULL), 0)::text AS receivable_30d,
        COALESCE((SELECT SUM(amount) FROM ${schema}.financial_entries
                  WHERE branch_id = ${branchLiteral}
                    AND type = 'PAYABLE'
                    AND due_date >= CURRENT_DATE
                    AND due_date <= CURRENT_DATE + INTERVAL '30 days'
                    AND deleted_at IS NULL), 0)::text AS payable_30d,
        COALESCE((SELECT SUM(CASE WHEN type = 'RECEIVABLE' THEN amount ELSE -amount END)
                  FROM ${schema}.financial_entries
                  WHERE branch_id = ${branchLiteral}
                    AND DATE_TRUNC('month', due_date) = DATE_TRUNC('month', CURRENT_DATE)
                    AND deleted_at IS NULL), 0)::text AS month_result
    `),
    );

    const row = result.rows[0] as Record<string, unknown> | undefined;
    return {
      currentBalance: this.toNullableText(row?.current_balance) ?? '0.00',
      totalReceivable30d: this.toNullableText(row?.receivable_30d) ?? '0.00',
      totalPayable30d: this.toNullableText(row?.payable_30d) ?? '0.00',
      monthResult: this.toNullableText(row?.month_result) ?? '0.00',
    };
  }

  async getOverdue(
    branchId: string,
  ): Promise<Array<{ id: string; description: string; amount: string }>> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, description, amount
      FROM ${schema}.financial_entries
      WHERE branch_id = ${branchLiteral}
        AND due_date < CURRENT_DATE
        AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
        AND deleted_at IS NULL
      ORDER BY due_date ASC
      LIMIT 20
    `),
    );

    return result.rows.map((row) => ({
      id: this.toText(row.id),
      description: this.toText(row.description),
      amount: this.toText(row.amount),
    }));
  }

  async getCashflowChart(
    branchId: string,
    period: string,
  ): Promise<Array<{ month: string; inflow: string; outflow: string }>> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const monthsBack = period === '6m' ? 6 : period === '3m' ? 3 : 12;

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', due_date), 'YYYY-MM') AS month,
        COALESCE(SUM(CASE WHEN type = 'RECEIVABLE' THEN amount ELSE 0 END), 0)::text AS inflow,
        COALESCE(SUM(CASE WHEN type = 'PAYABLE' THEN amount ELSE 0 END), 0)::text AS outflow
      FROM ${schema}.financial_entries
      WHERE branch_id = ${branchLiteral}
        AND due_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '${monthsBack - 1} months'
        AND deleted_at IS NULL
      GROUP BY DATE_TRUNC('month', due_date)
      ORDER BY DATE_TRUNC('month', due_date) ASC
    `),
    );

    return result.rows.map((row) => ({
      month: this.toText(row.month),
      inflow: this.toText(row.inflow),
      outflow: this.toText(row.outflow),
    }));
  }
}
