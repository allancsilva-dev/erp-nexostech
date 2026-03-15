import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { PaymentEntity } from './dto/payment.response';
import { RegisterPaymentDto } from './dto/register-payment.dto';

type EntryStub = {
  id: string;
  amount: string;
  remainingBalance: string;
  lastPaymentDate?: string;
};

@Injectable()
export class PaymentsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findEntryById(entryId: string): Promise<EntryStub> {
    this.drizzleService.getTenantDb();
    return {
      id: entryId,
      amount: '1000.00',
      remainingBalance: '1000.00',
    };
  }

  async createPayment(entryId: string, dto: RegisterPaymentDto, userId: string): Promise<PaymentEntity> {
    this.drizzleService.getTenantDb();
    return {
      id: randomUUID(),
      entryId,
      amount: dto.amount,
      paymentDate: dto.paymentDate,
      paymentMethod: dto.paymentMethod ?? null,
      bankAccountId: dto.bankAccountId ?? null,
      notes: dto.notes ?? null,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };
  }

  async listPaymentAmounts(entryId: string): Promise<string[]> {
    this.drizzleService.getTenantDb();
    void entryId;
    return [];
  }

  async removeLastPayment(entryId: string): Promise<PaymentEntity | null> {
    this.drizzleService.getTenantDb();
    void entryId;
    return null;
  }

  async updateEntryPaidStatus(entryId: string, _status: 'PENDING' | 'PARTIAL' | 'PAID'): Promise<void> {
    this.drizzleService.getTenantDb();
    void entryId;
  }
}
