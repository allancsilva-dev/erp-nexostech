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

type BalanceSheetData = {
  byCategory: Array<{ categoryName: string; inflow: string; outflow: string; net: string }>;
  totals: { inflow: string; outflow: string; net: string };
};

type AgingData = {
  ranges: Array<{ range: string; total: string; count: number }>;
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

  async export(
    tenantId: string,
    branchId: string,
    report: 'dre' | 'cashflow' | 'balance-sheet' | 'aging',
    startDate: string,
    endDate: string,
    format: 'csv' | 'pdf',
  ) {
    if (report === 'dre') {
      const data = await this.getDre(tenantId, branchId, startDate, endDate);
      const csv = `revenueTotal,expenseTotal,netResult\n${data.revenueTotal},${data.expenseTotal},${data.netResult}`;
      return {
        format,
        filename: `dre-${startDate}-${endDate}.${format}`,
        content:
          format === 'csv'
            ? csv
            : Buffer.from(`DRE\n${startDate} - ${endDate}\n${csv}`).toString('base64'),
      };
    }

    if (report === 'cashflow') {
      const data = await this.getCashflow(tenantId, branchId, startDate, endDate);
      const rows = data.rows.map((row) => `${row.date},${row.inflow},${row.outflow}`).join('\n');
      const csv = ['date,inflow,outflow', rows].filter(Boolean).join('\n');

      return {
        format,
        filename: `cashflow-${startDate}-${endDate}.${format}`,
        content:
          format === 'csv'
            ? csv
            : Buffer.from(`CASHFLOW\n${startDate} - ${endDate}\n${csv}`).toString('base64'),
      };
    }

    if (report === 'balance-sheet') {
      const data = await this.getBalanceSheet(tenantId, branchId, startDate, endDate);
      const rows = data.byCategory
        .map((row) => `${row.categoryName},${row.inflow},${row.outflow},${row.net}`)
        .join('\n');
      const csv = ['category,inflow,outflow,net', rows].filter(Boolean).join('\n');

      return {
        format,
        filename: `balance-sheet-${startDate}-${endDate}.${format}`,
        content:
          format === 'csv'
            ? csv
            : Buffer.from(`BALANCE SHEET\n${startDate} - ${endDate}\n${csv}`).toString('base64'),
      };
    }

    const data = await this.getAging(tenantId, branchId, startDate, endDate);
    const rows = data.ranges.map((row) => `${row.range},${row.total},${row.count}`).join('\n');
    const csv = ['range,total,count', rows].filter(Boolean).join('\n');

    return {
      format,
      filename: `aging-${startDate}-${endDate}.${format}`,
      content:
        format === 'csv'
          ? csv
          : Buffer.from(`AGING\n${startDate} - ${endDate}\n${csv}`).toString('base64'),
    };
  }

  async getBalanceSheet(tenantId: string, branchId: string, startDate: string, endDate: string) {
    const cacheKey = `reports:balance:${tenantId}:${branchId}:${startDate}:${endDate}`;
    const cached = await this.cacheService.get<BalanceSheetData>(cacheKey);
    if (cached) return cached;

    const result = await this.reportsRepository.getBalanceSheet(branchId, startDate, endDate);
    await this.cacheService.set(cacheKey, result, 300_000);
    return result;
  }

  async getAging(tenantId: string, branchId: string, startDate: string, endDate: string) {
    const cacheKey = `reports:aging:${tenantId}:${branchId}:${startDate}:${endDate}`;
    const cached = await this.cacheService.get<AgingData>(cacheKey);
    if (cached) return cached;

    const result = await this.reportsRepository.getAging(branchId, startDate, endDate);
    await this.cacheService.set(cacheKey, result, 300_000);
    return result;
  }
}
