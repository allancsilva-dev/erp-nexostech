import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  PaymentCreatedEvent,
  PaymentRefundedEvent,
  TransferCreatedEvent,
} from '../events/financial.events';
import { CacheService } from '../../infrastructure/cache/cache.service';

@Injectable()
export class CacheInvalidationListener {
  constructor(private readonly cacheService: CacheService) {}

  @OnEvent('payment.created')
  async onPaymentCreated(event: PaymentCreatedEvent): Promise<void> {
    await this.cacheService.del(
      `dashboard:summary:${event.tenantId}:${event.branchId}`,
    );
    await this.cacheService.del(
      `dashboard:overdue:${event.tenantId}:${event.branchId}`,
    );
  }

  @OnEvent('payment.refunded')
  async onPaymentRefunded(event: PaymentRefundedEvent): Promise<void> {
    await this.cacheService.del(
      `dashboard:summary:${event.tenantId}:${event.branchId}`,
    );
  }

  @OnEvent('transfer.created')
  async onTransferCreated(event: TransferCreatedEvent): Promise<void> {
    await this.cacheService.del(
      `reports:cashflow:${event.tenantId}:${event.branchId}`,
    );
  }
}
