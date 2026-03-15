import { Injectable } from '@nestjs/common';
import { CacheResult } from '../../../common/decorators/cache-result.decorator';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(
    readonly cacheService: CacheService,
    private readonly dashboardRepository: DashboardRepository,
  ) {}

  @CacheResult({ keyPrefix: 'dashboard:summary', ttlSeconds: 60 })
  async getSummary(tenantId: string, branchId: string) {
    void tenantId;
    return this.dashboardRepository.getSummary(branchId);
  }

  @CacheResult({ keyPrefix: 'dashboard:overdue', ttlSeconds: 60 })
  async getOverdue(tenantId: string, branchId: string) {
    void tenantId;
    return this.dashboardRepository.getOverdue(branchId);
  }

  @CacheResult({ keyPrefix: 'dashboard:cashflow', ttlSeconds: 60 })
  async getCashflowChart(tenantId: string, branchId: string, period: string) {
    void tenantId;
    return this.dashboardRepository.getCashflowChart(branchId, period);
  }
}
