import { HttpStatus, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferEntity } from './dto/transfer.response';

type QueryRow = Record<string, unknown>;

type SqlExecutor = {
  execute(query: any): Promise<{ rows: unknown[] }>;
};

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

  async list(
    branchId: string,
    options: { page?: number; pageSize?: number } = {},
  ): Promise<TransferEntity[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, options.pageSize ?? 50));
    const offset = (page - 1) * pageSize;

    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, branch_id, from_account_id, to_account_id, amount, transfer_date, description, created_by, created_at
      FROM ${schema}.financial_transfers
      WHERE branch_id = ${branchLiteral}
        AND deleted_at IS NULL
      ORDER BY created_at DESC, id DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
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
    tx?: SqlExecutor,
  ): Promise<TransferEntity> {
    const executor = tx ?? this.drizzleService.getClient();
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const fromAccountLiteral = quoteLiteral(dto.fromAccountId);
    const toAccountLiteral = quoteLiteral(dto.toAccountId);
    const amountLiteral = quoteLiteral(dto.amount);
    const transferDateLiteral = quoteLiteral(dto.transferDate);
    const descriptionLiteral = quoteLiteral(dto.description ?? null);
    const userLiteral = quoteLiteral(userId);

    const result: unknown = await executor.execute(
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
      // TODO: mover esta regra de negocio para a camada de service (refactor futuro)
      throw new BusinessException(
        'INTERNAL_ERROR',
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          branchId,
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
          operation: 'CREATE_TRANSFER',
        },
      );
    }

    return this.mapRow(row);
  }

  async getAccountBalanceForUpdate(
    accountId: string,
    branchId: string,
    tx: SqlExecutor,
  ): Promise<string> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const accountLiteral = quoteLiteral(accountId);
    const branchLiteral = quoteLiteral(branchId);

    const result: unknown = await tx.execute(
      sql.raw(`
      SELECT
        (
          COALESCE(ba.initial_balance, 0)
          + COALESCE((
              SELECT SUM(fep.amount)
              FROM ${schema}.financial_entry_payments fep
              JOIN ${schema}.financial_entries fe ON fe.id = fep.entry_id
              WHERE fe.bank_account_id = ${accountLiteral}
                AND fe.branch_id = ${branchLiteral}
                AND fe.type = 'RECEIVABLE'
                AND fe.status = 'PAID'
                AND fe.deleted_at IS NULL
            ), 0)
          - COALESCE((
              SELECT SUM(fep.amount)
              FROM ${schema}.financial_entry_payments fep
              JOIN ${schema}.financial_entries fe ON fe.id = fep.entry_id
              WHERE fe.bank_account_id = ${accountLiteral}
                AND fe.branch_id = ${branchLiteral}
                AND fe.type = 'PAYABLE'
                AND fe.status = 'PAID'
                AND fe.deleted_at IS NULL
            ), 0)
          + COALESCE((
              SELECT SUM(amount)
              FROM ${schema}.financial_transfers
              WHERE to_account_id = ${accountLiteral}
                AND branch_id = ${branchLiteral}
                AND deleted_at IS NULL
            ), 0)
          - COALESCE((
              SELECT SUM(amount)
              FROM ${schema}.financial_transfers
              WHERE from_account_id = ${accountLiteral}
                AND branch_id = ${branchLiteral}
                AND deleted_at IS NULL
            ), 0)
        )::text AS balance
      FROM ${schema}.bank_accounts ba
      WHERE ba.id = ${accountLiteral}
        AND ba.branch_id = ${branchLiteral}
        AND ba.deleted_at IS NULL
      LIMIT 1
      FOR UPDATE OF ba
    `),
    );

    const rows = getRows(result);
    if (!rows[0]) {
        throw new BusinessException(
          'BANK_ACCOUNT_NOT_FOUND',
          404,
          { accountId, branchId },
        );
    }

    return toText(rows[0].balance, '0.00');
  }

  async findActiveBankAccount(accountId: string): Promise<{ branchId: string } | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const accountLiteral = quoteLiteral(accountId);

    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT branch_id
      FROM ${schema}.bank_accounts
      WHERE id = ${accountLiteral}
        AND deleted_at IS NULL
      LIMIT 1
    `),
    );

    const row = getRows(result)[0];
    if (!row) {
      return null;
    }

    return {
      branchId: toText(row.branch_id),
    };
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
