import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { CashflowCalculator } from './domain/cashflow.calculator';
import { DreCalculator } from './domain/dre.calculator';
import { ReportsRepository } from './reports.repository';

type DreData = {
  revenueTotal: string;
  expenseTotal: string;
  netResult: string;
};

type CashflowRow = {
  date: string;
  inflow: string;
  outflow: string;
};

type CashflowData = {
  startBalance: string;
  rows: CashflowRow[];
  accumulated: string[];
};

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
    const cached = await this.cacheService.get<DreData>(cacheKey);
    if (cached) return cached;

    const base = await this.reportsRepository.getDre(branchId, startDate, endDate);
    const result: DreData = {
      ...base,
      netResult: this.dreCalculator.calculateResult(base.revenueTotal, base.expenseTotal),
    };

    await this.cacheService.set(cacheKey, result, 300_000);
    return result;
  }

  async getCashflow(tenantId: string, branchId: string, startDate: string, endDate: string) {
    const cacheKey = `reports:cashflow:${tenantId}:${branchId}:${startDate}:${endDate}`;
    const cached = await this.cacheService.get<CashflowData>(cacheKey);
    if (cached) return cached;

    const base = await this.reportsRepository.getCashflow(branchId, startDate, endDate);
    const accumulated = this.cashflowCalculator.calculateAccumulated(
      base.startBalance,
      base.rows.map((row) => ({ inflow: row.inflow, outflow: row.outflow })),
    );

    const result: CashflowData = {
      ...base,
      accumulated,
    };
    await this.cacheService.set(cacheKey, result, 300_000);
    return result;
  }

  async exportDre(
    tenantId: string,
    branchId: string,
    startDate: string,
    endDate: string,
    format: 'csv' | 'json',
  ) {
    const dre = await this.getDre(tenantId, branchId, startDate, endDate);
    const filename = `dre-${startDate}-${endDate}.${format}`;

    if (format === 'json') {
      return {
        format,
        filename,
        content: JSON.stringify(dre),
      };
    }

    return {
      format,
      filename,
      content: `revenueTotal,expenseTotal,netResult\n${dre.revenueTotal},${dre.expenseTotal},${dre.netResult}`,
    };
  }

  async exportCashflow(
    tenantId: string,
    branchId: string,
    startDate: string,
    endDate: string,
    format: 'csv' | 'json',
  ) {
    const cashflow = await this.getCashflow(tenantId, branchId, startDate, endDate);
    const filename = `cashflow-${startDate}-${endDate}.${format}`;

    if (format === 'json') {
      return {
        format,
        filename,
        content: JSON.stringify(cashflow),
      };
    }

    const rows = cashflow.rows
      .map((row) => `${row.date},${row.inflow},${row.outflow}`)
      .join('\n');

    return {
      format,
      filename,
      content: ['date,inflow,outflow', rows].filter(Boolean).join('\n'),
    };
  }
}
