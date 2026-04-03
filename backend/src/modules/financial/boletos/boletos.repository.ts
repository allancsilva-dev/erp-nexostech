import { HttpStatus, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';

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

  private mapRow(row: Record<string, unknown>): BoletoRow {
    return {
      id: this.toText(row.id),
      entryId: this.toText(row.entry_id),
      branchId: this.toText(row.branch_id),
      gatewayBoletoId: this.toText(row.gateway_boleto_id),
      status: this.toText(row.status),
      amount: this.toText(row.amount),
      dueDate: this.toText(row.due_date),
      pdfUrl: this.toNullableText(row.pdf_url),
      paidAt: this.toNullableText(row.paid_at)
        ? new Date(this.toText(row.paid_at)).toISOString()
        : null,
      createdAt: new Date(this.toText(row.created_at)).toISOString(),
    };
  }

  async listByBranch(branchId: string): Promise<BoletoRow[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, entry_id, branch_id, gateway_boleto_id, status, amount, due_date, pdf_url, paid_at, created_at
      FROM ${schema}.financial_boletos
      WHERE branch_id = ${branchLiteral}
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 100
    `),
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async findByEntryId(
    entryId: string,
    branchId: string,
  ): Promise<BoletoRow | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, entry_id, branch_id, gateway_boleto_id, status, amount, due_date, pdf_url, paid_at, created_at
      FROM ${schema}.financial_boletos
      WHERE entry_id = ${quoteLiteral(entryId)}
        AND branch_id = ${quoteLiteral(branchId)}
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `),
    );

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
    await this.drizzleService.getClient().execute(
      sql.raw(`
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
    `),
    );

    const current = await this.findByEntryId(entryId, branchId);
    if (!current) {
      // TODO: mover esta regra de negocio para a camada de service (refactor futuro)
      throw new BusinessException(
        'INTERNAL_ERROR',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { entryId, branchId, operation: 'RELOAD_GENERATED_BOLETO' },
      );
    }

    return current;
  }

  async markCancelled(entryId: string, branchId: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    await this.drizzleService.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.financial_boletos
      SET status = 'CANCELED', cancelled_at = NOW(), updated_at = NOW()
      WHERE entry_id = ${quoteLiteral(entryId)}
        AND branch_id = ${quoteLiteral(branchId)}
        AND deleted_at IS NULL
    `),
    );
  }

  async markWebhookStatus(
    entryId: string,
    status: string,
    paidAt?: string,
  ): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const paidAtLiteral = quoteLiteral(paidAt ?? null);
    await this.drizzleService.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.financial_boletos
      SET status = ${quoteLiteral(status)},
          paid_at = ${paidAtLiteral},
          updated_at = NOW()
      WHERE entry_id = ${quoteLiteral(entryId)}
        AND deleted_at IS NULL
    `),
    );
  }
}
