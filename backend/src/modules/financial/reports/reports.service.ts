import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { CashflowCalculator } from './domain/cashflow.calculator';
import { DreCalculator } from './domain/dre.calculator';
import { ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  private readonly dreCalculator = new DreCalculator();
  private readonly cashflowCalculator = new CashflowCalculator();

  constructor(
    readonly cacheService: CacheService,
    private readonly reportsRepository: ReportsRepository,
  ) {}

  async getDre(tenantId: string, branchId: string, startDate: string, endDate: string) {
    const cacheKey = `reports:dre:${tenantId}:${branchId}:${startDate}:${endDate}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const base = await this.reportsRepository.getDre(branchId, startDate, endDate);
    const result = {
      ...base,
      netResult: this.dreCalculator.calculateResult(base.revenueTotal, base.expenseTotal),
    };

    await this.cacheService.set(cacheKey, result, 300_000);
    return result;
  }

  async getCashflow(tenantId: string, branchId: string, startDate: string, endDate: string) {
    const cacheKey = `reports:cashflow:${tenantId}:${branchId}:${startDate}:${endDate}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const base = await this.reportsRepository.getCashflow(branchId, startDate, endDate);
    const accumulated = this.cashflowCalculator.calculateAccumulated(
      base.startBalance,
      base.rows.map((row) => ({ inflow: row.inflow, outflow: row.outflow })),
    );

    const result = {
      ...base,
      accumulated,
    };
    await this.cacheService.set(cacheKey, result, 300_000);
    return result;
  }
}
