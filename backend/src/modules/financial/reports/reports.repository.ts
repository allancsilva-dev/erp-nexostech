import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { quoteIdent, quoteLiteral } from '../../../infrastructure/database/sql-builder.util';

@Injectable()
export class ReportsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async getDre(branchId: string, startDate: string, endDate: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const startLiteral = quoteLiteral(startDate);
    const endLiteral = quoteLiteral(endDate);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'RECEIVABLE' THEN amount ELSE 0 END), 0)::text AS revenue_total,
        COALESCE(SUM(CASE WHEN type = 'PAYABLE' THEN amount ELSE 0 END), 0)::text AS expense_total
      FROM ${schema}.financial_entries
      WHERE branch_id = ${branchLiteral}
        AND due_date >= ${startLiteral}
        AND due_date <= ${endLiteral}
        AND deleted_at IS NULL
    `));

    const row = result.rows[0] as Record<string, unknown> | undefined;
    return {
      revenueTotal: row?.revenue_total ? String(row.revenue_total) : '0.00',
      expenseTotal: row?.expense_total ? String(row.expense_total) : '0.00',
    };
  }

  async getCashflow(branchId: string, startDate: string, endDate: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const startLiteral = quoteLiteral(startDate);
    const endLiteral = quoteLiteral(endDate);

    const balanceResult = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT
        (
          COALESCE((SELECT SUM(initial_balance) FROM ${schema}.bank_accounts WHERE branch_id = ${branchLiteral} AND deleted_at IS NULL), 0)
          + COALESCE((SELECT SUM(CASE WHEN type = 'RECEIVABLE' THEN amount ELSE -amount END)
                      FROM ${schema}.financial_entries
                      WHERE branch_id = ${branchLiteral}
                        AND due_date < ${startLiteral}
                        AND deleted_at IS NULL), 0)
        )::text AS start_balance
    `));

    const rowsResult = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT
        due_date::text AS row_date,
        COALESCE(SUM(CASE WHEN type = 'RECEIVABLE' THEN amount ELSE 0 END), 0)::text AS inflow,
        COALESCE(SUM(CASE WHEN type = 'PAYABLE' THEN amount ELSE 0 END), 0)::text AS outflow
      FROM ${schema}.financial_entries
      WHERE branch_id = ${branchLiteral}
        AND due_date >= ${startLiteral}
        AND due_date <= ${endLiteral}
        AND deleted_at IS NULL
      GROUP BY due_date
      ORDER BY due_date ASC
    `));

    const balanceRow = balanceResult.rows[0] as Record<string, unknown> | undefined;
    return {
      startBalance: balanceRow?.start_balance ? String(balanceRow.start_balance) : '0.00',
      rows: (rowsResult.rows as Array<Record<string, unknown>>).map((row) => ({
        date: String(row.row_date),
        inflow: String(row.inflow),
        outflow: String(row.outflow),
      })),
    };
  }
}
