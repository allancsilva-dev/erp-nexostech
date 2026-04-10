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

  @CacheResult({
    keyPrefix: 'dashboard:summary',
    ttlSeconds: 60,
    key: (tenantId, branchId) => `${tenantId}:${branchId}`,
  })
  async getSummary(tenantId: string, branchId: string) {
    void tenantId;
    return this.dashboardRepository.getSummary(branchId);
  }

  @CacheResult({
    keyPrefix: 'dashboard:overdue',
    ttlSeconds: 60,
    key: (tenantId, branchId) => `${tenantId}:${branchId}`,
  })
  async getOverdue(tenantId: string, branchId: string) {
    void tenantId;
    return this.dashboardRepository.getOverdue(branchId);
  }

  @CacheResult({
    keyPrefix: 'dashboard:cashflow',
    ttlSeconds: 60,
    key: (tenantId, branchId, period) => `${tenantId}:${branchId}:${period}`,
  })
  async getCashflowChart(tenantId: string, branchId: string, period: string) {
    void tenantId;
    const rows = await this.dashboardRepository.getCashflowChart(
      branchId,
      period,
    );
    return rows.map((r) => ({
      month: r.month,
      forecastInflow: r.forecast_inflow,
      forecastOutflow: r.forecast_outflow,
      actualInflow: r.actual_inflow,
      actualOutflow: r.actual_outflow,
    }));
  }
}
