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

  private buildBranchBalanceSQL(schema: string, branchLiteral: string): string {
    return `
      COALESCE((
        SELECT SUM(ba.initial_balance)
        FROM ${schema}.bank_accounts ba
        WHERE ba.branch_id = ${branchLiteral}
          AND ba.deleted_at IS NULL
      ), 0)
      + COALESCE((
          SELECT SUM(fep.amount)
          FROM ${schema}.financial_entry_payments fep
          JOIN ${schema}.financial_entries fe ON fe.id = fep.entry_id
          WHERE fe.branch_id = ${branchLiteral}
            AND fe.type = 'RECEIVABLE'
            AND fe.status = 'PAID'
            AND fe.deleted_at IS NULL
        ), 0)
      - COALESCE((
          SELECT SUM(fep.amount)
          FROM ${schema}.financial_entry_payments fep
          JOIN ${schema}.financial_entries fe ON fe.id = fep.entry_id
          WHERE fe.branch_id = ${branchLiteral}
            AND fe.type = 'PAYABLE'
            AND fe.status = 'PAID'
            AND fe.deleted_at IS NULL
        ), 0)
      + COALESCE((
          SELECT SUM(t.amount)
          FROM ${schema}.financial_transfers t
          WHERE t.branch_id = ${branchLiteral}
            AND t.deleted_at IS NULL
            AND t.to_account_id IN (
              SELECT ba.id FROM ${schema}.bank_accounts ba
              WHERE ba.branch_id = ${branchLiteral}
                AND ba.deleted_at IS NULL
            )
        ), 0)
      - COALESCE((
          SELECT SUM(t.amount)
          FROM ${schema}.financial_transfers t
          WHERE t.branch_id = ${branchLiteral}
            AND t.deleted_at IS NULL
            AND t.from_account_id IN (
              SELECT ba.id FROM ${schema}.bank_accounts ba
              WHERE ba.branch_id = ${branchLiteral}
                AND ba.deleted_at IS NULL
            )
        ), 0)
    `;
  }

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
        (${this.buildBranchBalanceSQL(schema, branchLiteral)})::text AS current_balance,
        COALESCE((SELECT SUM(amount) FROM ${schema}.financial_entries
                  WHERE branch_id = ${branchLiteral}
                    AND type = 'RECEIVABLE'
                    AND due_date >= CURRENT_DATE
                    AND due_date <= CURRENT_DATE + INTERVAL '30 days'
                    AND deleted_at IS NULL
                    AND status NOT IN ('DRAFT', 'CANCELLED')
                  ), 0)::text AS receivable_30d,
        COALESCE((SELECT SUM(amount) FROM ${schema}.financial_entries
                  WHERE branch_id = ${branchLiteral}
                    AND type = 'PAYABLE'
                    AND due_date >= CURRENT_DATE
                    AND due_date <= CURRENT_DATE + INTERVAL '30 days'
                    AND deleted_at IS NULL
                    AND status NOT IN ('DRAFT', 'CANCELLED')
                  ), 0)::text AS payable_30d,
        COALESCE((SELECT SUM(CASE WHEN type = 'RECEIVABLE' THEN amount ELSE -amount END)
                  FROM ${schema}.financial_entries
                  WHERE branch_id = ${branchLiteral}
                    AND DATE_TRUNC('month', due_date) = DATE_TRUNC('month', CURRENT_DATE)
                    AND deleted_at IS NULL
                    AND status NOT IN ('DRAFT', 'CANCELLED')
                  ), 0)::text AS month_result
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

  async getOverdue(branchId: string): Promise<Array<{
    id: string;
    description: string;
    amount: string;
    dueDate: string;
    type: string;
  }>> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, description, amount, due_date, type
      FROM ${schema}.financial_entries
      WHERE branch_id = ${branchLiteral}
        AND due_date <= CURRENT_DATE
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
      dueDate: this.toText(row.due_date),
      type: this.toText(row.type),
    }));
  }

  async getCashflowChart(
    branchId: string,
    period: string,
  ): Promise<Array<{ month: string; forecast_inflow: string; forecast_outflow: string; actual_inflow: string; actual_outflow: string }>> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const monthsBack = period === '6m' ? 6 : period === '3m' ? 3 : 12;

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT
        months.month,
        COALESCE(forecast.inflow, 0)::text AS forecast_inflow,
        COALESCE(forecast.outflow, 0)::text AS forecast_outflow,
        COALESCE(actual.inflow, 0)::text AS actual_inflow,
        COALESCE(actual.outflow, 0)::text AS actual_outflow
      FROM (
        SELECT TO_CHAR(d, 'YYYY-MM') AS month
        FROM generate_series(
          DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '${monthsBack - 1} months',
          DATE_TRUNC('month', CURRENT_DATE),
          '1 month'
        ) d
      ) months
      LEFT JOIN (
        -- PREVISTO: entries por due_date (exclui DRAFT e CANCELLED)
        SELECT
          TO_CHAR(DATE_TRUNC('month', due_date), 'YYYY-MM') AS month,
          SUM(CASE WHEN type = 'RECEIVABLE' THEN amount ELSE 0 END) AS inflow,
          SUM(CASE WHEN type = 'PAYABLE' THEN amount ELSE 0 END) AS outflow
        FROM ${schema}.financial_entries
        WHERE branch_id = ${branchLiteral}
          AND due_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '${monthsBack - 1} months'
          AND deleted_at IS NULL
          AND status NOT IN ('DRAFT', 'CANCELLED')
        GROUP BY DATE_TRUNC('month', due_date)
      ) forecast ON forecast.month = months.month
      LEFT JOIN (
        -- REALIZADO: payments por payment_date
        SELECT
          TO_CHAR(DATE_TRUNC('month', fep.payment_date), 'YYYY-MM') AS month,
          SUM(CASE WHEN fe.type = 'RECEIVABLE' THEN fep.amount ELSE 0 END) AS inflow,
          SUM(CASE WHEN fe.type = 'PAYABLE' THEN fep.amount ELSE 0 END) AS outflow
        FROM ${schema}.financial_entry_payments fep
        JOIN ${schema}.financial_entries fe ON fe.id = fep.entry_id
        WHERE fe.branch_id = ${branchLiteral}
          AND fep.payment_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '${monthsBack - 1} months'
          AND fe.deleted_at IS NULL
          AND fe.status = 'PAID'
        GROUP BY DATE_TRUNC('month', fep.payment_date)
      ) actual ON actual.month = months.month
      ORDER BY months.month ASC
    `),
    );

    return result.rows.map((row) => ({
      month: this.toText(row.month),
      forecast_inflow: this.toText(row.forecast_inflow),
      forecast_outflow: this.toText(row.forecast_outflow),
      actual_inflow: this.toText(row.actual_inflow),
      actual_outflow: this.toText(row.actual_outflow),
    }));
  }
}
