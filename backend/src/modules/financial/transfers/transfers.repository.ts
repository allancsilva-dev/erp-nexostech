import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferEntity } from './dto/transfer.response';

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

@Injectable()
export class TransfersRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private mapRow(row: Record<string, unknown>): TransferEntity {
    return {
      id: toText(row.id),
      branchId: toText(row.branch_id),
      fromAccountId: toText(row.from_account_id),
      toAccountId: toText(row.to_account_id),
      amount: toText(row.amount),
      transferDate: toText(row.transfer_date),
      description: toNullableText(row.description),
      createdBy: toText(row.created_by),
      createdAt: new Date(toText(row.created_at)).toISOString(),
    };
  }

  async list(branchId: string): Promise<TransferEntity[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);

    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, branch_id, from_account_id, to_account_id, amount, transfer_date, description, created_by, created_at
      FROM ${schema}.financial_transfers
      WHERE branch_id = ${branchLiteral}
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 100
    `),
    );

    return getRows(result).map((row) => this.mapRow(row));
  }

  async findById(id: string, branchId: string): Promise<TransferEntity | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const branchLiteral = quoteLiteral(branchId);

    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, branch_id, from_account_id, to_account_id, amount, transfer_date, description, created_by, created_at
      FROM ${schema}.financial_transfers
      WHERE id = ${idLiteral}
        AND branch_id = ${branchLiteral}
        AND deleted_at IS NULL
      LIMIT 1
    `),
    );

    const row = getRows(result)[0];
    return row ? this.mapRow(row) : null;
  }

  async create(
    branchId: string,
    dto: CreateTransferDto,
    userId: string,
  ): Promise<TransferEntity> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const fromAccountLiteral = quoteLiteral(dto.fromAccountId);
    const toAccountLiteral = quoteLiteral(dto.toAccountId);
    const amountLiteral = quoteLiteral(dto.amount);
    const transferDateLiteral = quoteLiteral(dto.transferDate);
    const descriptionLiteral = quoteLiteral(dto.description ?? null);
    const userLiteral = quoteLiteral(userId);

    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
      INSERT INTO ${schema}.financial_transfers (
        branch_id, from_account_id, to_account_id, amount, transfer_date, description, created_by
      ) VALUES (
        ${branchLiteral}, ${fromAccountLiteral}, ${toAccountLiteral}, ${amountLiteral}, ${transferDateLiteral}, ${descriptionLiteral}, ${userLiteral}
      )
      RETURNING id, branch_id, from_account_id, to_account_id, amount, transfer_date, description, created_by, created_at
    `),
    );

    const row = getRows(result)[0];
    if (!row) {
      throw new Error('Transfer creation failed');
    }

    return this.mapRow(row);
  }

  async softDelete(id: string, branchId: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const branchLiteral = quoteLiteral(branchId);

    await this.drizzleService.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.financial_transfers
      SET deleted_at = NOW()
      WHERE id = ${idLiteral}
        AND branch_id = ${branchLiteral}
        AND deleted_at IS NULL
    `),
    );
  }
}
