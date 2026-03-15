import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { EventBusService } from '../../../infrastructure/events/event-bus.service';
import { TransactionHelper } from '../../../infrastructure/database/transaction.helper';
import { AuthUser } from '../../../common/types/auth-user.type';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { EntryCalculator } from './domain/entry.calculator';
import { EntryRules } from './domain/entry.rules';
import { EntriesRepository } from './entries.repository';

@Injectable()
export class EntriesService {
  private readonly entryRules = new EntryRules();
  private readonly entryCalculator = new EntryCalculator();

  constructor(
    private readonly entriesRepository: EntriesRepository,
    private readonly txHelper: TransactionHelper,
    private readonly eventBus: EventBusService,
  ) {}

  async list(branchId: string) {
    return this.entriesRepository.list(branchId);
  }

  async getById(entryId: string, branchId: string) {
    const entry = await this.entriesRepository.findById(entryId, branchId);
    if (!entry) {
      throw new BusinessException(
        'ENTRY_NOT_FOUND',
        'Lancamento nao encontrado para a filial informada',
        { entryId, branchId },
        HttpStatus.NOT_FOUND,
      );
    }

    return entry;
  }

  async create(dto: CreateEntryDto, user: AuthUser, branchId: string) {
    this.entryRules.validateCreate(dto, null);

    const installments = dto.installment
      ? this.entryCalculator.calculateInstallments(dto.amount, dto.installmentCount ?? 1)
      : [dto.amount];

    const created = await this.txHelper.run(async () => {
      const firstInstallmentAmount = installments[0] ?? dto.amount;
      return this.entriesRepository.create({
        branchId,
        documentNumber: `${dto.type === 'PAYABLE' ? 'PAY' : 'REC'}-${new Date().getFullYear()}-00001`,
        type: dto.type,
        description: dto.description,
        amount: firstInstallmentAmount,
        issueDate: dto.issueDate,
        dueDate: dto.dueDate,
        status: 'DRAFT',
        categoryName: 'Categoria provisoria',
        contactName: null,
        paidAmount: null,
        remainingBalance: firstInstallmentAmount,
        installmentNumber: dto.installment ? 1 : null,
        installmentTotal: dto.installment ? dto.installmentCount ?? null : null,
        categoryId: dto.categoryId,
        contactId: dto.contactId ?? null,
      });
    });

    this.eventBus.emit('entry.created', {
      tenantId: user.tenantId,
      branchId,
      entryId: created.id,
      type: created.type,
    });

    return created;
  }

  async update(entryId: string, dto: UpdateEntryDto, user: AuthUser, branchId: string) {
    await this.getById(entryId, branchId);

    const updated = await this.txHelper.run(async () => {
      return this.entriesRepository.update(entryId, branchId, dto);
    });

    this.eventBus.emit('entry.updated', {
      tenantId: user.tenantId,
      branchId,
      entryId,
      updatedBy: user.sub,
    });

    return updated;
  }

  async softDelete(entryId: string, user: AuthUser, branchId: string): Promise<void> {
    await this.getById(entryId, branchId);

    await this.txHelper.run(async () => {
      await this.entriesRepository.softDelete(entryId, branchId);
    });

    this.eventBus.emit('entry.deleted', {
      tenantId: user.tenantId,
      branchId,
      entryId,
      deletedBy: user.sub,
    });
  }

  async restore(entryId: string, user: AuthUser, branchId: string) {
    const deleted = await this.entriesRepository.findDeletedById(entryId, branchId);
    if (!deleted) {
      throw new BusinessException(
        'ENTRY_NOT_FOUND',
        'Lancamento excluido nao encontrado para restauracao',
        { entryId, branchId },
        HttpStatus.NOT_FOUND,
      );
    }

    const restored = await this.txHelper.run(async () => {
      return this.entriesRepository.restore(entryId, branchId);
    });

    this.eventBus.emit('entry.restored', {
      tenantId: user.tenantId,
      branchId,
      entryId,
      restoredBy: user.sub,
    });

    return restored;
  }
}
