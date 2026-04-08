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

export type EntryRecord = {
  id: string;
  branchId: string;
  documentNumber: string | null;
  type: string;
  description: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  status: string;
  categoryName: string;
  contactName: string | null;
  paidAmount: string | null;
  remainingBalance: string;
  installmentNumber: number | null;
  installmentTotal: number | null;
  hasBoleto?: boolean;
  createdAt: string;
};

export type EntriesListFilters = {
  type?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
};

export type EntriesListOptions = {
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'dueDate' | 'amount';
  sortOrder?: 'asc' | 'desc';
};

export type EntriesListResult = {
  items: EntryRecord[];
  total: number;
  page: number;
  pageSize: number;
};

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

function toNullableText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const text = toText(value);
  return text.length > 0 ? text : null;
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

@Injectable()
export class EntriesRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(
    branchId: string,
    filters: EntriesListFilters = {},
    options: EntriesListOptions = {},
  ): Promise<EntriesListResult> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchIdLiteral = quoteLiteral(branchId);
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, options.pageSize ?? 50));
    const offset = (page - 1) * pageSize;
    const allowedSortColumns: Record<NonNullable<EntriesListOptions['sortBy']>, string> = {
      createdAt: 'e.created_at',
      dueDate: 'e.due_date',
      amount: 'e.amount',
    };
    const sortColumn = options.sortBy ? allowedSortColumns[options.sortBy] : undefined;
    const sortDirection = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const whereClauses = [
      `e.deleted_at IS NULL`,
      `e.branch_id = ${branchIdLiteral}`,
    ];

    if (filters.type) {
      whereClauses.push(`e.type = ${quoteLiteral(filters.type)}`);
    }

    if (filters.status) {
      whereClauses.push(`e.status = ${quoteLiteral(filters.status)}`);
    }

    if (filters.startDate) {
      whereClauses.push(`e.due_date >= ${quoteLiteral(filters.startDate)}`);
    }

    if (filters.endDate) {
      whereClauses.push(`e.due_date <= ${quoteLiteral(filters.endDate)}`);
    }

    if (filters.categoryId) {
      whereClauses.push(`e.category_id = ${quoteLiteral(filters.categoryId)}`);
    }

    if (filters.search) {
      const search = quoteLiteral(`%${filters.search}%`);
      whereClauses.push(`(
        e.description ILIKE ${search}
        OR e.document_number ILIKE ${search}
        OR COALESCE(ct.name, '') ILIKE ${search}
      )`);
    }

    const whereClause = whereClauses.join('\n        AND ');
    const orderClause = sortColumn
      ? `ORDER BY ${sortColumn} ${sortDirection}, e.id DESC`
      : `ORDER BY e.created_at DESC, e.id DESC`;

    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT
        COUNT(*) OVER()::int AS total_count,
        e.id,
        e.branch_id,
        e.document_number,
        e.type,
        e.description,
        e.amount,
        e.issue_date,
        e.due_date,
        e.status,
        c.name AS category_name,
        ct.name AS contact_name,
        e.paid_amount,
        (e.amount - COALESCE(e.paid_amount, 0))::text AS remaining_balance,
        e.installment_number,
        e.installment_total,
        e.created_at
      FROM ${schema}.financial_entries e
      LEFT JOIN ${schema}.categories c ON c.id = e.category_id
      LEFT JOIN ${schema}.contacts ct ON ct.id = e.contact_id
      WHERE ${whereClause}
      ${orderClause}
      LIMIT ${pageSize}
      OFFSET ${offset}
    `),
    );
    const rows = getRows(result);
    const total = Number(toText(rows[0]?.total_count, '0'));

    return {
      items: rows.map((row) => this.mapRow(row)),
      total,
      page,
      pageSize,
    };
  }

  async findById(
    entryId: string,
    branchId: string,
  ): Promise<EntryRecord | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entryIdLiteral = quoteLiteral(entryId);
    const branchIdLiteral = quoteLiteral(branchId);

    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT
        e.id,
        e.branch_id,
        e.document_number,
        e.type,
        e.description,
        e.amount,
        e.issue_date,
        e.due_date,
        e.status,
        c.name AS category_name,
        ct.name AS contact_name,
        e.paid_amount,
        (e.amount - COALESCE(e.paid_amount, 0))::text AS remaining_balance,
        e.installment_number,
        e.installment_total,
        EXISTS(
          SELECT 1
          FROM ${schema}.financial_boletos fb
          WHERE fb.entry_id = e.id
            AND fb.deleted_at IS NULL
            AND fb.status NOT IN ('CANCELED', 'CANCELLED')
        ) AS has_boleto,
        e.created_at
      FROM ${schema}.financial_entries e
      LEFT JOIN ${schema}.categories c ON c.id = e.category_id
      LEFT JOIN ${schema}.contacts ct ON ct.id = e.contact_id
      WHERE e.id = ${entryIdLiteral}
        AND e.branch_id = ${branchIdLiteral}
        AND e.deleted_at IS NULL
      LIMIT 1
    `),
    );

    const row = getRows(result)[0];
    if (!row) {
      return null;
    }

    return this.mapRow(row);
  }

  async findDeletedById(
    entryId: string,
    branchId: string,
  ): Promise<EntryRecord | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entryIdLiteral = quoteLiteral(entryId);
    const branchIdLiteral = quoteLiteral(branchId);

    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT
        e.id,
        e.branch_id,
        e.document_number,
        e.type,
        e.description,
        e.amount,
        e.issue_date,
        e.due_date,
        e.status,
        c.name AS category_name,
        ct.name AS contact_name,
        e.paid_amount,
        (e.amount - COALESCE(e.paid_amount, 0))::text AS remaining_balance,
        e.installment_number,
        e.installment_total,
        e.created_at
      FROM ${schema}.financial_entries e
      LEFT JOIN ${schema}.categories c ON c.id = e.category_id
      LEFT JOIN ${schema}.contacts ct ON ct.id = e.contact_id
      WHERE e.id = ${entryIdLiteral}
        AND e.branch_id = ${branchIdLiteral}
        AND e.deleted_at IS NOT NULL
      LIMIT 1
    `),
    );

    const row = getRows(result)[0];
    return row ? this.mapRow(row) : null;
  }

  async create(
    data: Omit<EntryRecord, 'id' | 'createdAt'> & {
      categoryId: string;
      contactId?: string | null;
      documentNumber?: string | null;
    },
    tx?: DrizzleTransaction,
  ): Promise<EntryRecord> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchId = quoteLiteral(data.branchId);
    const documentNumber = quoteLiteral(data.documentNumber ?? null);
    const type = quoteLiteral(data.type);
    const description = quoteLiteral(data.description);
    const amount = quoteLiteral(data.amount);
    const issueDate = quoteLiteral(data.issueDate);
    const dueDate = quoteLiteral(data.dueDate);
    const status = quoteLiteral(data.status);
    const categoryId = quoteLiteral(data.categoryId);
    const contactId = quoteLiteral(data.contactId ?? null);
    const paidAmount = quoteLiteral(data.paidAmount ?? null);
    const installmentNumber = quoteLiteral(data.installmentNumber);
    const installmentTotal = quoteLiteral(data.installmentTotal);

    const runner = tx ? tx : this.drizzleService.getClient();
    const result: unknown = await runner.execute(
      sql.raw(`
      INSERT INTO ${schema}.financial_entries (
        branch_id,
        document_number,
        type,
        description,
        amount,
        issue_date,
        due_date,
        status,
        category_id,
        contact_id,
        paid_amount,
        installment_number,
        installment_total,
        created_by
      ) VALUES (
        ${branchId},
        ${documentNumber},
        ${type},
        ${description},
        ${amount},
        ${issueDate},
        ${dueDate},
        ${status},
        ${categoryId},
        ${contactId},
        ${paidAmount},
        ${installmentNumber},
        ${installmentTotal},
        'system'
      )
      RETURNING id, branch_id, document_number, type, description, amount, issue_date, due_date, status,
                paid_amount, installment_number, installment_total, created_at
    `),
    );

    const row = getRows(result)[0];
    if (!row) {
      // TODO: mover esta regra de negocio para a camada de service (refactor futuro)
      throw new BusinessException(
        'INTERNAL_ERROR',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { branchId: data.branchId, operation: 'RELOAD_CREATED_ENTRY' },
      );
    }

    return {
      id: toText(row.id),
      branchId: toText(row.branch_id),
      documentNumber: toNullableText(row.document_number),
      type: toText(row.type),
      description: toText(row.description),
      amount: toText(row.amount),
      issueDate: toText(row.issue_date),
      dueDate: toText(row.due_date),
      status: toText(row.status),
      categoryName: data.categoryName,
      contactName: data.contactName,
      paidAmount: toNullableText(row.paid_amount),
      remainingBalance: toText(row.amount),
      installmentNumber: toNullableNumber(row.installment_number),
      installmentTotal: toNullableNumber(row.installment_total),
      createdAt: new Date(toText(row.created_at)).toISOString(),
    };
  }

  async update(
    entryId: string,
    branchId: string,
    data: {
      description?: string;
      amount?: string;
      dueDate?: string;
      categoryId?: string;
      contactId?: string;
    },
  ): Promise<EntryRecord> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entryIdLiteral = quoteLiteral(entryId);
    const branchIdLiteral = quoteLiteral(branchId);

    const sets: string[] = [];
    if (data.description !== undefined)
      sets.push(`description = ${quoteLiteral(data.description)}`);
    if (data.amount !== undefined)
      sets.push(`amount = ${quoteLiteral(data.amount)}`);
    if (data.dueDate !== undefined)
      sets.push(`due_date = ${quoteLiteral(data.dueDate)}`);
    if (data.categoryId !== undefined)
      sets.push(`category_id = ${quoteLiteral(data.categoryId)}`);
    if (data.contactId !== undefined)
      sets.push(`contact_id = ${quoteLiteral(data.contactId)}`);

    if (sets.length > 0) {
      await this.drizzleService.getClient().execute(
        sql.raw(`
        UPDATE ${schema}.financial_entries
        SET ${sets.join(', ')}
        WHERE id = ${entryIdLiteral}
          AND branch_id = ${branchIdLiteral}
          AND deleted_at IS NULL
      `),
      );
    }

    const updated = await this.findById(entryId, branchId);
    if (!updated) {
      // TODO: mover esta regra de negocio para a camada de service (refactor futuro)
      throw new BusinessException(
        'INTERNAL_ERROR',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { entryId, branchId, operation: 'RELOAD_UPDATED_ENTRY' },
      );
    }

    return updated;
  }

  async softDelete(entryId: string, branchId: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entryIdLiteral = quoteLiteral(entryId);
    const branchIdLiteral = quoteLiteral(branchId);

    await this.drizzleService.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.financial_entries
      SET deleted_at = NOW()
      WHERE id = ${entryIdLiteral}
        AND branch_id = ${branchIdLiteral}
        AND deleted_at IS NULL
    `),
    );
  }

  async restore(entryId: string, branchId: string): Promise<EntryRecord> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entryIdLiteral = quoteLiteral(entryId);
    const branchIdLiteral = quoteLiteral(branchId);

    await this.drizzleService.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.financial_entries
      SET deleted_at = NULL
      WHERE id = ${entryIdLiteral}
        AND branch_id = ${branchIdLiteral}
        AND deleted_at IS NOT NULL
    `),
    );

    const restored = await this.findById(entryId, branchId);
    if (!restored) {
      // TODO: mover esta regra de negocio para a camada de service (refactor futuro)
      throw new BusinessException(
        'INTERNAL_ERROR',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { entryId, branchId, operation: 'RELOAD_RESTORED_ENTRY' },
      );
    }

    return restored;
  }

  async cancel(entryId: string, branchId: string): Promise<EntryRecord> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entryIdLiteral = quoteLiteral(entryId);
    const branchIdLiteral = quoteLiteral(branchId);

    await this.drizzleService.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.financial_entries
      SET status = 'CANCELLED', updated_at = NOW()
      WHERE id = ${entryIdLiteral}
        AND branch_id = ${branchIdLiteral}
        AND deleted_at IS NULL
    `),
    );

    const cancelled = await this.findById(entryId, branchId);
    if (!cancelled) {
      // TODO: mover esta regra de negocio para a camada de service (refactor futuro)
      throw new BusinessException(
        'INTERNAL_ERROR',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { entryId, branchId, operation: 'RELOAD_CANCELLED_ENTRY' },
      );
    }

    return cancelled;
  }

  private mapRow(row: Record<string, unknown>): EntryRecord {
    return {
      id: toText(row.id),
      branchId: toText(row.branch_id),
      documentNumber: toText(row.document_number),
      type: toText(row.type),
      description: toText(row.description),
      amount: toText(row.amount),
      issueDate: toText(row.issue_date),
      dueDate: toText(row.due_date),
      status: toText(row.status),
      categoryName: toNullableText(row.category_name) ?? 'Sem categoria',
      contactName: toNullableText(row.contact_name),
      paidAmount: toNullableText(row.paid_amount),
      remainingBalance: toText(row.remaining_balance),
      installmentNumber: toNullableNumber(row.installment_number),
      installmentTotal: toNullableNumber(row.installment_total),
      hasBoleto: Boolean(row.has_boleto),
      createdAt: new Date(toText(row.created_at)).toISOString(),
    };
  }
}
