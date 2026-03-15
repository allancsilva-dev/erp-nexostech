import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { BankAccountEntity } from './dto/bank-account.response';

@Injectable()
export class BankAccountsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private mapRow(row: Record<string, unknown>): BankAccountEntity {
    return {
      id: String(row.id),
      branchId: String(row.branch_id),
      name: String(row.name),
      bankCode: row.bank_code ? String(row.bank_code) : null,
      agency: row.agency ? String(row.agency) : null,
      accountNumber: row.account_number ? String(row.account_number) : null,
      type: String(row.type),
      initialBalance: String(row.initial_balance),
      active: Boolean(row.active),
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  }

  async list(branchId: string): Promise<BankAccountEntity[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branch = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, branch_id, name, bank_code, agency, account_number, type, initial_balance, active, created_at
      FROM ${schema}.bank_accounts
      WHERE branch_id = ${branch}
        AND deleted_at IS NULL
      ORDER BY created_at DESC
    `),
    );

    return (result.rows as Array<Record<string, unknown>>).map((row) =>
      this.mapRow(row),
    );
  }

  async findById(
    id: string,
    branchId: string,
  ): Promise<BankAccountEntity | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const branchLiteral = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, branch_id, name, bank_code, agency, account_number, type, initial_balance, active, created_at
      FROM ${schema}.bank_accounts
      WHERE id = ${idLiteral}
        AND branch_id = ${branchLiteral}
        AND deleted_at IS NULL
      LIMIT 1
    `),
    );

    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  async create(
    branchId: string,
    dto: CreateBankAccountDto,
  ): Promise<BankAccountEntity> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchIdLiteral = quoteLiteral(branchId);
    const name = quoteLiteral(dto.name);
    const bankCode = quoteLiteral(dto.bankCode ?? null);
    const agency = quoteLiteral(dto.agency ?? null);
    const accountNumber = quoteLiteral(dto.accountNumber ?? null);
    const type = quoteLiteral(dto.type);
    const initialBalance = quoteLiteral(dto.initialBalance);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      INSERT INTO ${schema}.bank_accounts (
        branch_id, name, bank_code, agency, account_number, type, initial_balance, active
      ) VALUES (
        ${branchIdLiteral}, ${name}, ${bankCode}, ${agency}, ${accountNumber}, ${type}, ${initialBalance}, true
      )
      RETURNING id, branch_id, name, bank_code, agency, account_number, type, initial_balance, active, created_at
    `),
    );

    const row = result.rows[0] as Record<string, unknown>;
    return this.mapRow(row);
  }

  async update(
    id: string,
    branchId: string,
    dto: {
      name?: string;
      bankCode?: string;
      agency?: string;
      accountNumber?: string;
      type?: string;
      initialBalance?: string;
    },
  ): Promise<BankAccountEntity> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const branchLiteral = quoteLiteral(branchId);
    const sets: string[] = [];

    if (dto.name !== undefined) sets.push(`name = ${quoteLiteral(dto.name)}`);
    if (dto.bankCode !== undefined)
      sets.push(`bank_code = ${quoteLiteral(dto.bankCode)}`);
    if (dto.agency !== undefined)
      sets.push(`agency = ${quoteLiteral(dto.agency)}`);
    if (dto.accountNumber !== undefined)
      sets.push(`account_number = ${quoteLiteral(dto.accountNumber)}`);
    if (dto.type !== undefined) sets.push(`type = ${quoteLiteral(dto.type)}`);
    if (dto.initialBalance !== undefined)
      sets.push(`initial_balance = ${quoteLiteral(dto.initialBalance)}`);

    if (sets.length > 0) {
      await this.drizzleService.getClient().execute(
        sql.raw(`
        UPDATE ${schema}.bank_accounts
        SET ${sets.join(', ')}
        WHERE id = ${idLiteral}
          AND branch_id = ${branchLiteral}
          AND deleted_at IS NULL
      `),
      );
    }

    const updated = await this.findById(id, branchId);
    if (!updated) {
      throw new Error('Updated bank account could not be reloaded');
    }

    return updated;
  }

  async softDelete(id: string, branchId: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const branchLiteral = quoteLiteral(branchId);

    await this.drizzleService.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.bank_accounts
      SET deleted_at = NOW(), active = false
      WHERE id = ${idLiteral}
        AND branch_id = ${branchLiteral}
        AND deleted_at IS NULL
    `),
    );
  }
}
