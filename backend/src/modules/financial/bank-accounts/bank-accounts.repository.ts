import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { quoteIdent, quoteLiteral } from '../../../infrastructure/database/sql-builder.util';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { BankAccountEntity } from './dto/bank-account.response';

@Injectable()
export class BankAccountsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(branchId: string): Promise<BankAccountEntity[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branch = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT id, branch_id, name, bank_code, agency, account_number, type, initial_balance, active, created_at
      FROM ${schema}.bank_accounts
      WHERE branch_id = ${branch}
        AND deleted_at IS NULL
      ORDER BY created_at DESC
    `));

    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
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
    }));
  }

  async create(dto: CreateBankAccountDto): Promise<BankAccountEntity> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchId = quoteLiteral(dto.branchId);
    const name = quoteLiteral(dto.name);
    const bankCode = quoteLiteral(dto.bankCode ?? null);
    const agency = quoteLiteral(dto.agency ?? null);
    const accountNumber = quoteLiteral(dto.accountNumber ?? null);
    const type = quoteLiteral(dto.type);
    const initialBalance = quoteLiteral(dto.initialBalance);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      INSERT INTO ${schema}.bank_accounts (
        branch_id, name, bank_code, agency, account_number, type, initial_balance, active
      ) VALUES (
        ${branchId}, ${name}, ${bankCode}, ${agency}, ${accountNumber}, ${type}, ${initialBalance}, true
      )
      RETURNING id, branch_id, name, bank_code, agency, account_number, type, initial_balance, active, created_at
    `));

    const row = result.rows[0] as Record<string, unknown>;
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
}
