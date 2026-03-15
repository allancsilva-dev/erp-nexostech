import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';

export type AuditLogEntity = {
  id: string;
  branchId: string | null;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  requestId: string | null;
  createdAt: string;
};

@Injectable()
export class AuditRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(_page: number, _pageSize: number): Promise<{ items: AuditLogEntity[]; total: number }> {
    this.drizzleService.getTenantDb();
    return { items: [], total: 0 };
  }
}
