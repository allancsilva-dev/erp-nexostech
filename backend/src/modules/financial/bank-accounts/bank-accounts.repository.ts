import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { BankAccountEntity } from './dto/bank-account.response';

@Injectable()
export class BankAccountsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(branchId: string): Promise<BankAccountEntity[]> {
    this.drizzleService.getTenantDb();
    void branchId;
    return [];
  }

  async create(dto: CreateBankAccountDto): Promise<BankAccountEntity> {
    this.drizzleService.getTenantDb();
    return {
      id: randomUUID(),
      branchId: dto.branchId,
      name: dto.name,
      bankCode: dto.bankCode ?? null,
      agency: dto.agency ?? null,
      accountNumber: dto.accountNumber ?? null,
      type: dto.type,
      initialBalance: dto.initialBalance,
      active: true,
      createdAt: new Date().toISOString(),
    };
  }
}
