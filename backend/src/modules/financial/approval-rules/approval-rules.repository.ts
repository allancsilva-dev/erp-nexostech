import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { CreateApprovalRuleDto } from './dto/create-approval-rule.dto';

@Injectable()
export class ApprovalRulesRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(branchId: string) {
    this.drizzleService.getTenantDb();
    void branchId;
    return [] as Array<Record<string, unknown>>;
  }

  async create(branchId: string, dto: CreateApprovalRuleDto) {
    this.drizzleService.getTenantDb();
    return {
      id: randomUUID(),
      branchId,
      ...dto,
    };
  }
}
