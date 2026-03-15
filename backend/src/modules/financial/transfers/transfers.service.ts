import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { TransferCreatedEvent } from '../../../common/events/financial.events';
import { BusinessException } from '../../../common/exceptions/business.exception';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { TransactionHelper } from '../../../infrastructure/database/transaction.helper';
import { EventBusService } from '../../../infrastructure/events/event-bus.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransfersRepository } from './transfers.repository';

@Injectable()
export class TransfersService {
  constructor(
    private readonly transfersRepository: TransfersRepository,
    private readonly txHelper: TransactionHelper,
    private readonly eventBus: EventBusService,
  ) {}

  async list(branchId: string) {
    return this.transfersRepository.list(branchId);
  }

  async create(branchId: string, dto: CreateTransferDto, user: AuthUser) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BusinessException('VALIDATION_ERROR', 'Conta origem e destino devem ser diferentes', undefined, 400);
    }

    if (new Decimal(dto.amount).lte(0)) {
      throw new BusinessException('VALIDATION_ERROR', 'Valor da transferencia deve ser positivo', undefined, 400);
    }

    const created = await this.txHelper.run(async () => {
      return this.transfersRepository.create(branchId, dto, user.sub);
    });

    this.eventBus.emit(
      'transfer.created',
      new TransferCreatedEvent(user.tenantId, branchId, created.id, dto.amount),
    );

    return created;
  }
}
