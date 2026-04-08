import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import {
  PaymentRefundedEvent,
} from '../../../common/events/financial.events';
import { BusinessException } from '../../../common/exceptions/business.exception';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { TransactionHelper } from '../../../infrastructure/database/transaction.helper';
import { EventBusService } from '../../../infrastructure/events/event-bus.service';
import { OutboxService } from '../../../infrastructure/outbox/outbox.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';
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
    private readonly outboxService: OutboxService,
    private readonly drizzleService: DrizzleService,
  ) {}

  async registerPayment(
    entryId: string,
    dto: RegisterPaymentDto,
    user: AuthUser,
    branchId: string,
  ) {
    const payment = await this.txHelper.run(async (tx) => {
      const entry: EntryStub | null =
        await this.paymentsRepository.findEntryByIdForUpdate(entryId, branchId, tx);

      if (!entry) {
        throw new BusinessException('ENTRY_NOT_FOUND', HttpStatus.NOT_FOUND, {
          entryId,
          branchId,
        });
      }

      const allowedStatuses = ['PENDING', 'PARTIAL', 'OVERDUE'];
      const entryStatus = (entry.status ?? '').toUpperCase();
      if (!allowedStatuses.includes(entryStatus)) {
        throw new BusinessException('INVALID_STATUS_TRANSITION', 400, {
          operation: 'REGISTER_PAYMENT',
          currentStatus: entryStatus,
          allowedStatuses,
        });
      }

      this.paymentRules.validatePaymentAmount(entry.remainingBalance, dto.amount);

      const created = await this.paymentsRepository.createPayment(entryId, dto, user.sub, tx);

      const amounts = await this.paymentsRepository.listPaymentAmounts(entryId, tx);
      const status = this.paymentCalculator.determineStatus(entry.amount, amounts);

      await this.paymentsRepository.updateEntryPaidStatus(entryId, status, tx);

      await this.outboxService.insert(tx, user.tenantId, 'payment.created', {
        branchId,
        entryId,
        amount: dto.amount,
      });

      return created;
    });

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
        HttpStatus.NOT_FOUND,
        { entryId, branchId },
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
    if (!dto?.reason || dto.reason.trim().length < 10) {
      throw new BusinessException('VALIDATION_ERROR', 400, {
        field: 'reason',
        minLength: 10,
      });
    }

    const removedPayment = await this.txHelper.run(async (tx) => {
      const entry = await this.paymentsRepository.findEntryByIdForUpdate(
        entryId,
        branchId,
        tx,
      );

      if (!entry) {
        throw new BusinessException('ENTRY_NOT_FOUND', HttpStatus.NOT_FOUND, {
          entryId,
          branchId,
        });
      }

      if (entry.status !== 'PAID' && entry.status !== 'PARTIAL') {
        throw new BusinessException('ENTRY_INVALID_STATUS_REFUND', 422, {
          entryId,
          status: entry.status,
          allowed: ['PAID', 'PARTIAL'],
        });
      }

      const payment = await this.paymentsRepository.findPaymentById(
        dto.paymentId,
        branchId,
        tx,
      );

      if (!payment) return null;

      if (payment.entryId !== entryId) {
        throw new BusinessException('PAYMENT_NOT_FOUND', HttpStatus.NOT_FOUND, {
          paymentId: dto.paymentId,
          entryId,
        });
      }

      await this.validateRefundDeadline(entry, payment.paymentDate, branchId);

      const removed = await this.paymentsRepository.removePaymentById(dto.paymentId, tx);
      if (!removed) return null;

      const amounts = await this.paymentsRepository.listPaymentAmounts(entryId, tx);
      const status = this.paymentCalculator.determineStatus(entry.amount, amounts);
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
          removedPayment.id,
          removedPayment.amount,
        ),
      );
    }

    return removedPayment;
  }

  private async validateRefundDeadline(
    entry: EntryStub,
    paymentDate: string,
    branchId: string,
  ): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
        SELECT max_refund_days_payable, max_refund_days_receivable
        FROM ${schema}.financial_settings
        WHERE branch_id = ${quoteLiteral(branchId)}::uuid
        LIMIT 1
      `),
    );

    const row = result.rows[0] as
      | {
          max_refund_days_payable?: unknown;
          max_refund_days_receivable?: unknown;
        }
      | undefined;

    const maxDays =
      entry.type === 'PAYABLE'
        ? Number(row?.max_refund_days_payable ?? 90)
        : Number(row?.max_refund_days_receivable ?? 180);

    const reference = new Date(`${paymentDate}T00:00:00`);
    const daysSince = Math.floor(
      (Date.now() - reference.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSince > maxDays) {
      throw new BusinessException('ENTRY_REFUND_DEADLINE_EXCEEDED', 422, {
        entryId: entry.id,
        paymentDate,
        maxDays,
        daysSince,
      });
    }
  }
}
