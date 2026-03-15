import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(
    readonly cacheService: CacheService,
    private readonly dashboardRepository: DashboardRepository,
  ) {}

  async getSummary(tenantId: string, branchId: string) {
    const cacheKey = `dashboard:summary:${tenantId}:${branchId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const data = await this.dashboardRepository.getSummary(branchId);
    await this.cacheService.set(cacheKey, data, 60_000);
    return data;
  }

  async getOverdue(tenantId: string, branchId: string) {
    const cacheKey = `dashboard:overdue:${tenantId}:${branchId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const data = await this.dashboardRepository.getOverdue(branchId);
    await this.cacheService.set(cacheKey, data, 60_000);
    return data;
  }

  async getCashflowChart(tenantId: string, branchId: string, period: string) {
    const cacheKey = `dashboard:cashflow:${tenantId}:${branchId}:${period}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const data = await this.dashboardRepository.getCashflowChart(branchId, period);
    await this.cacheService.set(cacheKey, data, 60_000);
    return data;
  }
}
