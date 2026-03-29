import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import {
  PaymentCreatedEvent,
  PaymentRefundedEvent,
} from '../../../common/events/financial.events';
import { BusinessException } from '../../../common/exceptions/business.exception';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { TransactionHelper } from '../../../infrastructure/database/transaction.helper';
import { EventBusService } from '../../../infrastructure/events/event-bus.service';
import { PaymentCalculator } from './domain/payment.calculator';
import { PaymentRules } from './domain/payment.rules';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { PaymentEntity } from './dto/payment.response';
import { PaymentsRepository, EntryStub } from './payments.repository';
import { BatchPayDto } from './dto/batch-pay.dto';

@Injectable()
export class PaymentsService {
  private readonly paymentRules = new PaymentRules();
  private readonly paymentCalculator = new PaymentCalculator();

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly txHelper: TransactionHelper,
    private readonly eventBus: EventBusService,
  ) {}

  async registerPayment(
    entryId: string,
    dto: RegisterPaymentDto,
    user: AuthUser,
    branchId: string,
  ) {
    // Toda a operação roda dentro da mesma transação com SELECT FOR UPDATE
    // para evitar race condition quando dois usuários pagam a mesma entry simultaneamente.
    const payment = await this.txHelper.run(async (tx) => {
      // 1. SELECT FOR UPDATE — trava a linha da entry para este request
      const entry: EntryStub | null =
        await this.paymentsRepository.findEntryByIdForUpdate(
          entryId,
          branchId,
          tx,
        );

      if (!entry) {
        throw new BusinessException(
          'ENTRY_NOT_FOUND',
          'Lancamento nao encontrado para pagamento',
          { entryId, branchId },
          HttpStatus.NOT_FOUND,
        );
      }

      // Validate entry status before inserting a payment
      const allowedStatuses = ['PENDING', 'PARTIAL', 'OVERDUE'];
      const entryStatus = entry.status ?? '';
      if (!allowedStatuses.includes(entryStatus)) {
        throw new BadRequestException(
          'Não é possível registrar pagamento para lançamento com status ' +
            entryStatus,
        );
      }

      // 2. Valida com saldo REAL (dentro do lock) — evita aceitar pagamento acima do saldo
      this.paymentRules.validatePaymentAmount(
        entry.remainingBalance,
        dto.amount,
      );

      // 3. Cria o pagamento dentro da transação
      const created = await this.paymentsRepository.createPayment(
        entryId,
        dto,
        user.sub,
        tx,
      );

      // 4. Calcula novo status com os pagamentos atualizados
      const amounts = await this.paymentsRepository.listPaymentAmounts(
        entryId,
        tx,
      );
      const status = this.paymentCalculator.determineStatus(
        entry.amount,
        amounts,
      );

      // 5. Atualiza status e valor pago dentro da transação
      await this.paymentsRepository.updateEntryPaidStatus(entryId, status, tx);

      return created;
    });

    // Eventos emitidos FORA da transação (após commit)
    this.eventBus.emit(
      'payment.created',
      new PaymentCreatedEvent(user.tenantId, branchId, entryId, dto.amount),
    );

    return payment;
  }

  async listByEntry(entryId: string, branchId: string) {
    const entry = await this.paymentsRepository.findEntryById(
      entryId,
      branchId,
    );
    if (!entry) {
      throw new BusinessException(
        'ENTRY_NOT_FOUND',
        'Lancamento nao encontrado para consulta de pagamentos',
        { entryId, branchId },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.paymentsRepository.listByEntry(entryId);
  }

  async batchPay(dto: BatchPayDto, user: AuthUser, branchId: string) {
    const created: PaymentEntity[] = [];
    for (const item of dto.items) {
      const payment = await this.registerPayment(
        item.entryId,
        item,
        user,
        branchId,
      );
      created.push(payment);
    }

    return created;
  }

  async refund(
    entryId: string,
    dto: RefundPaymentDto,
    user: AuthUser,
    branchId: string,
  ) {
    // Validate reason length
    if (!dto?.reason || dto.reason.trim().length < 10) {
      throw new BadRequestException('Motivo deve ter no mínimo 10 caracteres');
    }
    // Estorno também usa SELECT FOR UPDATE para evitar estorno duplo simultâneo
    const removedPayment = await this.txHelper.run(async (tx) => {
      // 1. SELECT FOR UPDATE — trava a entry para este request
      const entry = await this.paymentsRepository.findEntryByIdForUpdate(
        entryId,
        branchId,
        tx,
      );

      if (!entry) {
        throw new BusinessException(
          'ENTRY_NOT_FOUND',
          'Lancamento nao encontrado para estorno',
          { entryId, branchId },
          HttpStatus.NOT_FOUND,
        );
      }

      this.paymentRules.validateRefundPeriod(
        entry.lastPaymentDate ?? new Date().toISOString(),
        90,
      );

      // 2. Remove último pagamento dentro da transação
      const removed = await this.paymentsRepository.removeLastPayment(
        entryId,
        tx,
      );

      // 3. Recalcula status com pagamentos restantes
      const amounts = await this.paymentsRepository.listPaymentAmounts(
        entryId,
        tx,
      );
      const status = this.paymentCalculator.determineStatus(
        entry.amount,
        amounts,
      );
      await this.paymentsRepository.updateEntryPaidStatus(entryId, status, tx);

      return removed;
    });

    if (removedPayment) {
      this.eventBus.emit(
        'payment.refunded',
        new PaymentRefundedEvent(
          user.tenantId,
          branchId,
          entryId,
          removedPayment.amount,
        ),
      );
    }

    return removedPayment;
  }
}
