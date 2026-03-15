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

  async getBalanceSheet(branchId: string, startDate: string, endDate: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const startLiteral = quoteLiteral(startDate);
    const endLiteral = quoteLiteral(endDate);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT
        COALESCE(c.name, 'Sem categoria') AS category_name,
        COALESCE(SUM(CASE WHEN e.type = 'RECEIVABLE' THEN e.amount ELSE 0 END), 0)::text AS inflow,
        COALESCE(SUM(CASE WHEN e.type = 'PAYABLE' THEN e.amount ELSE 0 END), 0)::text AS outflow,
        COALESCE(SUM(CASE WHEN e.type = 'RECEIVABLE' THEN e.amount ELSE -e.amount END), 0)::text AS net
      FROM ${schema}.financial_entries e
      LEFT JOIN ${schema}.categories c ON c.id = e.category_id
      WHERE e.branch_id = ${branchLiteral}
        AND e.due_date >= ${startLiteral}
        AND e.due_date <= ${endLiteral}
        AND e.deleted_at IS NULL
      GROUP BY COALESCE(c.name, 'Sem categoria')
      ORDER BY category_name ASC
    `));

    const rows = (result.rows as Array<Record<string, unknown>>).map((row) => ({
      categoryName: String(row.category_name),
      inflow: String(row.inflow),
      outflow: String(row.outflow),
      net: String(row.net),
    }));

    const totals = rows.reduce(
      (acc, row) => ({
        inflow: (Number(acc.inflow) + Number(row.inflow)).toFixed(2),
        outflow: (Number(acc.outflow) + Number(row.outflow)).toFixed(2),
        net: (Number(acc.net) + Number(row.net)).toFixed(2),
      }),
      { inflow: '0.00', outflow: '0.00', net: '0.00' },
    );

    return { byCategory: rows, totals };
  }

  async getAging(branchId: string, startDate: string, endDate: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const startLiteral = quoteLiteral(startDate);
    const endLiteral = quoteLiteral(endDate);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT
        CASE
          WHEN CURRENT_DATE - e.due_date <= 15 THEN '1-15'
          WHEN CURRENT_DATE - e.due_date <= 30 THEN '16-30'
          WHEN CURRENT_DATE - e.due_date <= 60 THEN '31-60'
          ELSE '60+'
        END AS aging_range,
        COALESCE(SUM(e.amount - COALESCE(e.paid_amount, 0)), 0)::text AS total,
        COUNT(*)::int AS count
      FROM ${schema}.financial_entries e
      WHERE e.branch_id = ${branchLiteral}
        AND e.type = 'RECEIVABLE'
        AND e.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
        AND e.due_date >= ${startLiteral}
        AND e.due_date <= ${endLiteral}
        AND e.deleted_at IS NULL
      GROUP BY aging_range
      ORDER BY aging_range
    `));

    return {
      ranges: (result.rows as Array<Record<string, unknown>>).map((row) => ({
        range: String(row.aging_range),
        total: String(row.total),
        count: Number(row.count),
      })),
    };
  }
}
