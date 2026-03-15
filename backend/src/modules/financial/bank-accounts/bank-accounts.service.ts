import { Injectable } from '@nestjs/common';
import { BankAccountsRepository } from './bank-accounts.repository';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';

@Injectable()
export class BankAccountsService {
  constructor(private readonly bankAccountsRepository: BankAccountsRepository) {}

  async list(branchId: string) {
    return this.bankAccountsRepository.list(branchId);
  }

  async create(dto: CreateBankAccountDto) {
    return this.bankAccountsRepository.create(dto);
  }
}
