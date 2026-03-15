import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { CreateCollectionRuleDto } from './dto/create-collection-rule.dto';

@Injectable()
export class CollectionRulesRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(branchId: string) {
    this.drizzleService.getTenantDb();
    void branchId;
    return [] as Array<Record<string, unknown>>;
  }

  async create(branchId: string, dto: CreateCollectionRuleDto) {
    this.drizzleService.getTenantDb();
    return { id: randomUUID(), branchId, ...dto };
  }
}
