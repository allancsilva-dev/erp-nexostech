import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { quoteIdent, quoteLiteral } from '../../../infrastructure/database/sql-builder.util';

type BoletoRow = {
  id: string;
  entryId: string;
  branchId: string;
  gatewayBoletoId: string;
  status: string;
  amount: string;
  dueDate: string;
  pdfUrl: string | null;
  paidAt: string | null;
  createdAt: string;
};

@Injectable()
export class BoletosRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private mapRow(row: Record<string, unknown>): BoletoRow {
    return {
      id: String(row.id),
      entryId: String(row.entry_id),
      branchId: String(row.branch_id),
      gatewayBoletoId: String(row.gateway_boleto_id),
      status: String(row.status),
      amount: String(row.amount),
      dueDate: String(row.due_date),
      pdfUrl: row.pdf_url ? String(row.pdf_url) : null,
      paidAt: row.paid_at ? new Date(String(row.paid_at)).toISOString() : null,
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  }

  async listByBranch(branchId: string): Promise<BoletoRow[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT id, entry_id, branch_id, gateway_boleto_id, status, amount, due_date, pdf_url, paid_at, created_at
      FROM ${schema}.financial_boletos
      WHERE branch_id = ${branchLiteral}
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 100
    `));

    return (result.rows as Array<Record<string, unknown>>).map((row) => this.mapRow(row));
  }

  async findByEntryId(entryId: string, branchId: string): Promise<BoletoRow | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT id, entry_id, branch_id, gateway_boleto_id, status, amount, due_date, pdf_url, paid_at, created_at
      FROM ${schema}.financial_boletos
      WHERE entry_id = ${quoteLiteral(entryId)}
        AND branch_id = ${quoteLiteral(branchId)}
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `));

    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  async upsertGenerated(
    entryId: string,
    branchId: string,
    amount: string,
    dueDate: string,
    gatewayBoletoId: string,
    status: string,
    pdfUrl: string,
  ): Promise<BoletoRow> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    await this.drizzleService.getClient().execute(sql.raw(`
      INSERT INTO ${schema}.financial_boletos (
        entry_id, branch_id, gateway_boleto_id, status, amount, due_date, pdf_url
      ) VALUES (
        ${quoteLiteral(entryId)}, ${quoteLiteral(branchId)}, ${quoteLiteral(gatewayBoletoId)}, ${quoteLiteral(status)},
        ${quoteLiteral(amount)}, ${quoteLiteral(dueDate)}, ${quoteLiteral(pdfUrl)}
      )
      ON CONFLICT (entry_id)
      DO UPDATE SET
        gateway_boleto_id = EXCLUDED.gateway_boleto_id,
        status = EXCLUDED.status,
        amount = EXCLUDED.amount,
        due_date = EXCLUDED.due_date,
        pdf_url = EXCLUDED.pdf_url,
        updated_at = NOW(),
        deleted_at = NULL
    `));

    const current = await this.findByEntryId(entryId, branchId);
    if (!current) {
      throw new Error('Generated boleto could not be loaded');
    }

    return current;
  }

  async markCancelled(entryId: string, branchId: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    await this.drizzleService.getClient().execute(sql.raw(`
      UPDATE ${schema}.financial_boletos
      SET status = 'CANCELED', cancelled_at = NOW(), updated_at = NOW()
      WHERE entry_id = ${quoteLiteral(entryId)}
        AND branch_id = ${quoteLiteral(branchId)}
        AND deleted_at IS NULL
    `));
  }

  async markWebhookStatus(entryId: string, status: string, paidAt?: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const paidAtLiteral = quoteLiteral(paidAt ?? null);
    await this.drizzleService.getClient().execute(sql.raw(`
      UPDATE ${schema}.financial_boletos
      SET status = ${quoteLiteral(status)},
          paid_at = ${paidAtLiteral},
          updated_at = NOW()
      WHERE entry_id = ${quoteLiteral(entryId)}
        AND deleted_at IS NULL
    `));
  }
}
