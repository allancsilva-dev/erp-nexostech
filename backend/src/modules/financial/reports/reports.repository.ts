import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import Decimal from 'decimal.js';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';

type QueryRow = Record<string, unknown>;

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
export class ReportsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async getDre(branchId: string, startDate: string, endDate: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const startLiteral = quoteLiteral(startDate);
    const endLiteral = quoteLiteral(endDate);

    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'RECEIVABLE' THEN amount ELSE 0 END), 0)::text AS revenue_total,
        COALESCE(SUM(CASE WHEN type = 'PAYABLE' THEN amount ELSE 0 END), 0)::text AS expense_total
      FROM ${schema}.financial_entries
      WHERE branch_id = ${branchLiteral}
        AND due_date >= ${startLiteral}
        AND due_date <= ${endLiteral}
        AND deleted_at IS NULL
    `),
    );

    const row = getRows(result)[0];
    return {
      revenueTotal: row ? toText(row.revenue_total, '0.00') : '0.00',
      expenseTotal: row ? toText(row.expense_total, '0.00') : '0.00',
    };
  }

  async getCashflow(branchId: string, startDate: string, endDate: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const startLiteral = quoteLiteral(startDate);
    const endLiteral = quoteLiteral(endDate);

    const balanceResult: unknown = await this.drizzleService
      .getClient()
      .execute(
        sql.raw(`
      SELECT (
        COALESCE((
          SELECT SUM(initial_balance)
          FROM ${schema}.bank_accounts
          WHERE branch_id = ${branchLiteral} AND deleted_at IS NULL
        ), 0)
        + COALESCE((
          SELECT SUM(fep.amount)
          FROM ${schema}.financial_entry_payments fep
          JOIN ${schema}.financial_entries fe ON fe.id = fep.entry_id
          WHERE fe.branch_id = ${branchLiteral}
            AND fe.type = 'RECEIVABLE'
            AND fe.deleted_at IS NULL
            AND fep.payment_date < ${startLiteral}
        ), 0)
        - COALESCE((
          SELECT SUM(fep.amount)
          FROM ${schema}.financial_entry_payments fep
          JOIN ${schema}.financial_entries fe ON fe.id = fep.entry_id
          WHERE fe.branch_id = ${branchLiteral}
            AND fe.type = 'PAYABLE'
            AND fe.deleted_at IS NULL
            AND fep.payment_date < ${startLiteral}
        ), 0)
      )::text AS start_balance
    `),
      );

    const rowsResult: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT
        due_date::text AS row_date,
        COALESCE(SUM(CASE WHEN type = 'RECEIVABLE' THEN amount ELSE 0 END), 0)::text AS inflow,
        COALESCE(SUM(CASE WHEN type = 'PAYABLE' THEN amount ELSE 0 END), 0)::text AS outflow
      FROM ${schema}.financial_entries
      WHERE branch_id = ${branchLiteral}
        AND due_date >= ${startLiteral}
        AND due_date <= ${endLiteral}
        AND deleted_at IS NULL
        AND status = 'PENDING'
      GROUP BY due_date
      ORDER BY due_date ASC
    `),
    );

    const balanceRow = getRows(balanceResult)[0];

    const actualResult: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT
        fep.payment_date::text AS row_date,
        COALESCE(SUM(CASE WHEN fe.type = 'RECEIVABLE' THEN fep.amount ELSE 0 END), 0)::text AS inflow,
        COALESCE(SUM(CASE WHEN fe.type = 'PAYABLE' THEN fep.amount ELSE 0 END), 0)::text AS outflow
      FROM ${schema}.financial_entry_payments fep
      JOIN ${schema}.financial_entries fe ON fe.id = fep.entry_id
      WHERE fe.branch_id = ${branchLiteral}
        AND fep.payment_date >= ${startLiteral}
        AND fep.payment_date <= ${endLiteral}
        AND fe.deleted_at IS NULL
      GROUP BY fep.payment_date
      ORDER BY fep.payment_date ASC
    `),
    );

    return {
      startBalance: balanceRow
        ? toText(balanceRow.start_balance, '0.00')
        : '0.00',
      rows: getRows(rowsResult).map((row) => ({
        date: toText(row.row_date),
        inflow: toText(row.inflow),
        outflow: toText(row.outflow),
      })),
      actualRows: getRows(actualResult).map((row) => ({
        date: toText(row.row_date),
        inflow: toText(row.inflow),
        outflow: toText(row.outflow),
      })),
    };
  }

  async getBalanceSheet(branchId: string, startDate: string, endDate: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const startLiteral = quoteLiteral(startDate);
    const endLiteral = quoteLiteral(endDate);

    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
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
          AND e.status NOT IN ('DRAFT', 'CANCELLED')
      GROUP BY COALESCE(c.name, 'Sem categoria')
      ORDER BY category_name ASC
    `),
    );

    const rows = getRows(result).map((row) => ({
      categoryName: toText(row.category_name),
      inflow: toText(row.inflow),
      outflow: toText(row.outflow),
      net: toText(row.net),
    }));

    const totals = rows.reduce(
      (acc, row) => ({
        inflow: new Decimal(acc.inflow).plus(row.inflow).toFixed(2),
        outflow: new Decimal(acc.outflow).plus(row.outflow).toFixed(2),
        net: new Decimal(acc.net).plus(row.net).toFixed(2),
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

    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT
        CASE
          WHEN CURRENT_DATE - e.due_date <= 15 THEN '1-15'
          WHEN CURRENT_DATE - e.due_date <= 30 THEN '16-30'
          WHEN CURRENT_DATE - e.due_date <= 60 THEN '31-60'
          ELSE '60+'
        END AS aging_range,
        COALESCE(SUM(e.amount - COALESCE(p.paid, 0)), 0)::text AS total,
        COUNT(*)::int AS count
      FROM ${schema}.financial_entries e
      LEFT JOIN (
        SELECT entry_id, SUM(amount) AS paid
        FROM ${schema}.financial_entry_payments
        GROUP BY entry_id
      ) p ON p.entry_id = e.id
      WHERE e.branch_id = ${branchLiteral}
        AND e.type = 'RECEIVABLE'
        AND e.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
        AND e.due_date >= ${startLiteral}
        AND e.due_date <= ${endLiteral}
        AND e.deleted_at IS NULL
      GROUP BY aging_range
      ORDER BY aging_range
    `),
    );

    return {
      ranges: getRows(result).map((row) => ({
        range: toText(row.aging_range),
        total: toText(row.total),
        count: Number(toText(row.count, '0')),
      })),
    };
  }
}
