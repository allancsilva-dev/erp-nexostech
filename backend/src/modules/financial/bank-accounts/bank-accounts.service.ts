import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { BankAccountsRepository } from './bank-accounts.repository';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@Injectable()
export class BankAccountsService {
  constructor(
    private readonly bankAccountsRepository: BankAccountsRepository,
  ) {}

  async list(branchId: string) {
    return this.bankAccountsRepository.list(branchId);
  }

  async create(branchId: string, dto: CreateBankAccountDto) {
    return this.bankAccountsRepository.create(branchId, dto);
  }

  async update(id: string, branchId: string, dto: UpdateBankAccountDto) {
    const existing = await this.bankAccountsRepository.findById(id, branchId);
    if (!existing) {
      throw new BusinessException(
        'BANK_ACCOUNT_NOT_FOUND',
        'Conta bancaria nao encontrada para a filial informada',
        { id, branchId },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.bankAccountsRepository.update(id, branchId, dto);
  }

  async softDelete(id: string, branchId: string): Promise<void> {
    const existing = await this.bankAccountsRepository.findById(id, branchId);
    if (!existing) {
      throw new BusinessException(
        'BANK_ACCOUNT_NOT_FOUND',
        'Conta bancaria nao encontrada para a filial informada',
        { id, branchId },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.bankAccountsRepository.softDelete(id, branchId);
  }
}
