import { Injectable } from '@nestjs/common';
import { EventBusService } from '../../../infrastructure/events/event-bus.service';
import { TransactionHelper } from '../../../infrastructure/database/transaction.helper';
import { AuthUser } from '../../../common/types/auth-user.type';
import { CreateEntryDto } from './dto/create-entry.dto';
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

  async list() {
    return this.entriesRepository.list();
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
}
