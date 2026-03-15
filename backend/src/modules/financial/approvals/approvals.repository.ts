import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';

@Injectable()
export class ApprovalsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async listPending(branchId: string) {
    this.drizzleService.getTenantDb();
    void branchId;
    return [] as Array<Record<string, unknown>>;
  }

  async createApprovalRecord(entryId: string, userId: string, action: 'APPROVED' | 'REJECTED', notes?: string) {
    this.drizzleService.getTenantDb();
    return {
      id: randomUUID(),
      entryId,
      userId,
      action,
      notes: notes ?? null,
      createdAt: new Date().toISOString(),
    };
  }
}
