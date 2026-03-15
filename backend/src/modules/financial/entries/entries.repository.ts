import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { quoteIdent, quoteLiteral } from '../../../infrastructure/database/sql-builder.util';

export type EntryRecord = {
  id: string;
  branchId: string;
  documentNumber: string;
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
  createdAt: string;
};

@Injectable()
export class EntriesRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(branchId: string): Promise<EntryRecord[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchIdLiteral = quoteLiteral(branchId);
    const result = await this.drizzleService.getClient().execute(sql.raw(`
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
      WHERE e.deleted_at IS NULL
        AND e.branch_id = ${branchIdLiteral}
      ORDER BY e.created_at DESC
      LIMIT 100
    `));

    return (result.rows as Array<Record<string, unknown>>).map((row) => this.mapRow(row));
  }

  async findById(entryId: string, branchId: string): Promise<EntryRecord | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entryIdLiteral = quoteLiteral(entryId);
    const branchIdLiteral = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
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
        AND e.deleted_at IS NULL
      LIMIT 1
    `));

    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }

    return this.mapRow(row);
  }

  async create(data: Omit<EntryRecord, 'id' | 'createdAt'> & { categoryId: string; contactId?: string | null }): Promise<EntryRecord> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchId = quoteLiteral(data.branchId);
    const documentNumber = quoteLiteral(data.documentNumber);
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

    const result = await this.drizzleService.getClient().execute(sql.raw(`
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
    `));

    const row = result.rows[0] as Record<string, unknown>;

    return {
      id: String(row.id),
      branchId: String(row.branch_id),
      documentNumber: String(row.document_number),
      type: String(row.type),
      description: String(row.description),
      amount: String(row.amount),
      issueDate: String(row.issue_date),
      dueDate: String(row.due_date),
      status: String(row.status),
      categoryName: data.categoryName,
      contactName: data.contactName,
      paidAmount: row.paid_amount ? String(row.paid_amount) : null,
      remainingBalance: String(row.amount),
      installmentNumber: row.installment_number ? Number(row.installment_number) : null,
      installmentTotal: row.installment_total ? Number(row.installment_total) : null,
      createdAt: new Date(String(row.created_at)).toISOString(),
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
    if (data.description !== undefined) sets.push(`description = ${quoteLiteral(data.description)}`);
    if (data.amount !== undefined) sets.push(`amount = ${quoteLiteral(data.amount)}`);
    if (data.dueDate !== undefined) sets.push(`due_date = ${quoteLiteral(data.dueDate)}`);
    if (data.categoryId !== undefined) sets.push(`category_id = ${quoteLiteral(data.categoryId)}`);
    if (data.contactId !== undefined) sets.push(`contact_id = ${quoteLiteral(data.contactId)}`);

    if (sets.length > 0) {
      await this.drizzleService.getClient().execute(sql.raw(`
        UPDATE ${schema}.financial_entries
        SET ${sets.join(', ')}
        WHERE id = ${entryIdLiteral}
          AND branch_id = ${branchIdLiteral}
          AND deleted_at IS NULL
      `));
    }

    const updated = await this.findById(entryId, branchId);
    if (!updated) {
      throw new Error('Updated entry could not be reloaded');
    }

    return updated;
  }

  async softDelete(entryId: string, branchId: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const entryIdLiteral = quoteLiteral(entryId);
    const branchIdLiteral = quoteLiteral(branchId);

    await this.drizzleService.getClient().execute(sql.raw(`
      UPDATE ${schema}.financial_entries
      SET deleted_at = NOW()
      WHERE id = ${entryIdLiteral}
        AND branch_id = ${branchIdLiteral}
        AND deleted_at IS NULL
    `));
  }

  private mapRow(row: Record<string, unknown>): EntryRecord {
    return {
      id: String(row.id),
      branchId: String(row.branch_id),
      documentNumber: String(row.document_number),
      type: String(row.type),
      description: String(row.description),
      amount: String(row.amount),
      issueDate: String(row.issue_date),
      dueDate: String(row.due_date),
      status: String(row.status),
      categoryName: row.category_name ? String(row.category_name) : 'Sem categoria',
      contactName: row.contact_name ? String(row.contact_name) : null,
      paidAmount: row.paid_amount ? String(row.paid_amount) : null,
      remainingBalance: String(row.remaining_balance),
      installmentNumber: row.installment_number ? Number(row.installment_number) : null,
      installmentTotal: row.installment_total ? Number(row.installment_total) : null,
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  }
}
