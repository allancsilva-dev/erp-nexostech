import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { CreateLockPeriodDto } from './dto/create-lock-period.dto';

@Injectable()
export class LockPeriodsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(branchId: string) {
    this.drizzleService.getTenantDb();
    void branchId;
    return [] as Array<Record<string, unknown>>;
  }

  async create(branchId: string, userId: string, dto: CreateLockPeriodDto) {
    this.drizzleService.getTenantDb();
    return {
      id: randomUUID(),
      branchId,
      lockedUntil: dto.lockedUntil,
      reason: dto.reason ?? null,
      lockedBy: userId,
    };
  }
}
