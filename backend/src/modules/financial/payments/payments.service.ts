import { Injectable } from '@nestjs/common';
import { PaymentCreatedEvent, PaymentRefundedEvent } from '../../../common/events/financial.events';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { TransactionHelper } from '../../../infrastructure/database/transaction.helper';
import { EventBusService } from '../../../infrastructure/events/event-bus.service';
import { PaymentCalculator } from './domain/payment.calculator';
import { PaymentRules } from './domain/payment.rules';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
  private readonly paymentRules = new PaymentRules();
  private readonly paymentCalculator = new PaymentCalculator();

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly txHelper: TransactionHelper,
    private readonly eventBus: EventBusService,
  ) {}

  async registerPayment(entryId: string, dto: RegisterPaymentDto, user: AuthUser, branchId: string) {
    const entry = await this.paymentsRepository.findEntryById(entryId);
    this.paymentRules.validatePaymentAmount(entry.remainingBalance, dto.amount);

    const payment = await this.txHelper.run(async () => {
      const created = await this.paymentsRepository.createPayment(entryId, dto, user.sub);
      const amounts = [...(await this.paymentsRepository.listPaymentAmounts(entryId)), dto.amount];
      const status = this.paymentCalculator.determineStatus(entry.amount, amounts);
      await this.paymentsRepository.updateEntryPaidStatus(entryId, status);
      return created;
    });

    this.eventBus.emit(
      'payment.created',
      new PaymentCreatedEvent(user.tenantId, branchId, entryId, dto.amount),
    );

    return payment;
  }

  async refund(entryId: string, _dto: RefundPaymentDto, user: AuthUser, branchId: string) {
    const entry = await this.paymentsRepository.findEntryById(entryId);
    this.paymentRules.validateRefundPeriod(entry.lastPaymentDate ?? new Date().toISOString(), 90);

    const removedPayment = await this.txHelper.run(async () => {
      const removed = await this.paymentsRepository.removeLastPayment(entryId);
      const amounts = await this.paymentsRepository.listPaymentAmounts(entryId);
      const status = this.paymentCalculator.determineStatus(entry.amount, amounts);
      await this.paymentsRepository.updateEntryPaidStatus(entryId, status);
      return removed;
    });

    if (removedPayment) {
      this.eventBus.emit(
        'payment.refunded',
        new PaymentRefundedEvent(user.tenantId, branchId, entryId, removedPayment.amount),
      );
    }

    return removedPayment;
  }
}
