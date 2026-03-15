import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferEntity } from './dto/transfer.response';

@Injectable()
export class TransfersRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(branchId: string): Promise<TransferEntity[]> {
    this.drizzleService.getTenantDb();
    void branchId;
    return [];
  }

  async create(branchId: string, dto: CreateTransferDto, userId: string): Promise<TransferEntity> {
    this.drizzleService.getTenantDb();
    return {
      id: randomUUID(),
      branchId,
      fromAccountId: dto.fromAccountId,
      toAccountId: dto.toAccountId,
      amount: dto.amount,
      transferDate: dto.transferDate,
      description: dto.description ?? null,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };
  }
}
