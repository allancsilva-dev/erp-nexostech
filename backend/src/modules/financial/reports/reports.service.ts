import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { CashflowCalculator } from './domain/cashflow.calculator';
import { DreCalculator } from './domain/dre.calculator';
import {
  buildSimplePdf,
  csvEscape,
  formatCurrency,
  formatTableRow,
} from './pdf.builder';
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
  actualRows?: CashflowRow[];
  actualAccumulated?: string[];
};

type BalanceSheetData = {
  byCategory: Array<{
    categoryName: string;
    inflow: string;
    outflow: string;
    net: string;
  }>;
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

  private buildDreCsv(data: DreData): string {
    return [
      'revenueTotal,expenseTotal,netResult',
      [data.revenueTotal, data.expenseTotal, data.netResult]
        .map(csvEscape)
        .join(','),
    ].join('\n');
  }

  private buildCashflowCsv(rows: CashflowRow[]): string {
    return [
      'date,inflow,outflow',
      ...rows.map((row) =>
        [row.date, row.inflow, row.outflow].map(csvEscape).join(','),
      ),
    ].join('\n');
  }

  private buildBalanceSheetCsv(data: BalanceSheetData): string {
    return [
      'category,inflow,outflow,net',
      ...data.byCategory.map((row) =>
        [row.categoryName, row.inflow, row.outflow, row.net]
          .map(csvEscape)
          .join(','),
      ),
      [
        csvEscape('TOTAL'),
        csvEscape(data.totals.inflow),
        csvEscape(data.totals.outflow),
        csvEscape(data.totals.net),
      ].join(','),
    ].join('\n');
  }

  private buildAgingCsv(data: AgingData): string {
    return [
      'range,total,count',
      ...data.ranges.map((row) =>
        [row.range, row.total, String(row.count)].map(csvEscape).join(','),
      ),
    ].join('\n');
  }

  async getDre(
    tenantId: string,
    branchId: string,
    startDate: string,
    endDate: string,
  ) {
    const cacheKey = `reports:dre:${tenantId}:${branchId}:${startDate}:${endDate}`;
    const cached = await this.cacheService.get<DreData>(cacheKey);
    if (cached) return cached;

    const base = await this.reportsRepository.getDre(
      branchId,
      startDate,
      endDate,
    );
    const result: DreData = {
      ...base,
      netResult: this.dreCalculator.calculateResult(
        base.revenueTotal,
        base.expenseTotal,
      ),
    };

    await this.cacheService.set(cacheKey, result, 300_000);
    return result;
  }

  async getCashflow(
    tenantId: string,
    branchId: string,
    startDate: string,
    endDate: string,
  ) {
    const cacheKey = `reports:cashflow:${tenantId}:${branchId}:${startDate}:${endDate}`;
    const cached = await this.cacheService.get<CashflowData>(cacheKey);
    if (cached) return cached;

    const base = await this.reportsRepository.getCashflow(
      branchId,
      startDate,
      endDate,
    );

    const forecastAccumulated = this.cashflowCalculator.calculateAccumulated(
      base.startBalance,
      base.rows.map((row) => ({ inflow: row.inflow, outflow: row.outflow })),
    );

    const actualAccumulated = this.cashflowCalculator.calculateAccumulated(
      base.startBalance,
      (base.actualRows ?? []).map((row) => ({ inflow: row.inflow, outflow: row.outflow })),
    );

    const result: CashflowData = {
      ...base,
      accumulated: forecastAccumulated,
      actualRows: base.actualRows ?? [],
      actualAccumulated,
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
      content: this.buildDreCsv(dre),
    };
  }

  async exportCashflow(
    tenantId: string,
    branchId: string,
    startDate: string,
    endDate: string,
    format: 'csv' | 'json',
  ) {
    const cashflow = await this.getCashflow(
      tenantId,
      branchId,
      startDate,
      endDate,
    );
    const filename = `cashflow-${startDate}-${endDate}.${format}`;

    if (format === 'json') {
      return {
        format,
        filename,
        content: JSON.stringify(cashflow),
      };
    }

    return {
      format,
      filename,
      content: this.buildCashflowCsv(cashflow.rows),
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
      const csv = this.buildDreCsv(data);

      if (format === 'pdf') {
        const lines = [
          `Periodo: ${startDate} - ${endDate}`,
          '',
          formatTableRow([
            { value: 'Receita Total', width: 30 },
            { value: formatCurrency(data.revenueTotal), width: 20 },
          ]),
          formatTableRow([
            { value: 'Despesa Total', width: 30 },
            { value: formatCurrency(data.expenseTotal), width: 20 },
          ]),
          '',
          formatTableRow([
            { value: 'Resultado Liquido', width: 30 },
            { value: formatCurrency(data.netResult), width: 20 },
          ]),
        ];
        const pdfBuffer = await buildSimplePdf(
          'DRE - Demonstrativo de Resultado',
          lines,
        );

        return {
          format,
          filename: `dre-${startDate}-${endDate}.pdf`,
          content: pdfBuffer.toString('base64'),
        };
      }

      return {
        format,
        filename: `dre-${startDate}-${endDate}.${format}`,
        content: csv,
      };
    }

    if (report === 'cashflow') {
      const data = await this.getCashflow(
        tenantId,
        branchId,
        startDate,
        endDate,
      );
      const csv = this.buildCashflowCsv(data.rows);

      if (format === 'pdf') {
        const header = formatTableRow([
          { value: 'Data', width: 14 },
          { value: 'Entradas', width: 18 },
          { value: 'Saidas', width: 18 },
        ]);
        const separator = '-'.repeat(50);
        const lines = [
          `Periodo: ${startDate} - ${endDate}`,
          `Saldo Inicial: ${formatCurrency(data.startBalance)}`,
          '',
          header,
          separator,
          ...data.rows.map((row) =>
            formatTableRow([
              { value: row.date, width: 14 },
              { value: formatCurrency(row.inflow), width: 18 },
              { value: formatCurrency(row.outflow), width: 18 },
            ]),
          ),
        ];
        const pdfBuffer = await buildSimplePdf('Fluxo de Caixa', lines);

        return {
          format,
          filename: `cashflow-${startDate}-${endDate}.pdf`,
          content: pdfBuffer.toString('base64'),
        };
      }

      return {
        format,
        filename: `cashflow-${startDate}-${endDate}.${format}`,
        content: csv,
      };
    }

    if (report === 'balance-sheet') {
      const data = await this.getBalanceSheet(
        tenantId,
        branchId,
        startDate,
        endDate,
      );
      const csv = this.buildBalanceSheetCsv(data);

      if (format === 'pdf') {
        const header = formatTableRow([
          { value: 'Categoria', width: 30 },
          { value: 'Entradas', width: 15 },
          { value: 'Saidas', width: 15 },
          { value: 'Resultado', width: 15 },
        ]);
        const separator = '-'.repeat(79);
        const lines = [
          `Periodo: ${startDate} - ${endDate}`,
          '',
          header,
          separator,
          ...data.byCategory.map((row) =>
            formatTableRow([
              { value: row.categoryName, width: 30 },
              { value: formatCurrency(row.inflow), width: 15 },
              { value: formatCurrency(row.outflow), width: 15 },
              { value: formatCurrency(row.net), width: 15 },
            ]),
          ),
          separator,
          formatTableRow([
            { value: 'TOTAL', width: 30 },
            { value: formatCurrency(data.totals.inflow), width: 15 },
            { value: formatCurrency(data.totals.outflow), width: 15 },
            { value: formatCurrency(data.totals.net), width: 15 },
          ]),
        ];
        const pdfBuffer = await buildSimplePdf(
          'Balancete por Categoria',
          lines,
        );

        return {
          format,
          filename: `balance-sheet-${startDate}-${endDate}.pdf`,
          content: pdfBuffer.toString('base64'),
        };
      }

      return {
        format,
        filename: `balance-sheet-${startDate}-${endDate}.${format}`,
        content: csv,
      };
    }

    const data = await this.getAging(tenantId, branchId, startDate, endDate);
    const csv = this.buildAgingCsv(data);

    if (format === 'pdf') {
      const header = formatTableRow([
        { value: 'Faixa (dias)', width: 20 },
        { value: 'Total', width: 20 },
        { value: 'Quantidade', width: 12 },
      ]);
      const separator = '-'.repeat(54);
      const lines = [
        `Periodo: ${startDate} - ${endDate}`,
        '',
        header,
        separator,
        ...data.ranges.map((row) =>
          formatTableRow([
            { value: row.range, width: 20 },
            { value: formatCurrency(row.total), width: 20 },
            { value: String(row.count), width: 12 },
          ]),
        ),
      ];
      const pdfBuffer = await buildSimplePdf(
        'Aging - Contas a Receber',
        lines,
      );

      return {
        format,
        filename: `aging-${startDate}-${endDate}.pdf`,
        content: pdfBuffer.toString('base64'),
      };
    }

    return {
      format,
      filename: `aging-${startDate}-${endDate}.${format}`,
      content: csv,
    };
  }

  async getBalanceSheet(
    tenantId: string,
    branchId: string,
    startDate: string,
    endDate: string,
  ) {
    const cacheKey = `reports:balance:${tenantId}:${branchId}:${startDate}:${endDate}`;
    const cached = await this.cacheService.get<BalanceSheetData>(cacheKey);
    if (cached) return cached;

    const result = await this.reportsRepository.getBalanceSheet(
      branchId,
      startDate,
      endDate,
    );
    await this.cacheService.set(cacheKey, result, 300_000);
    return result;
  }

  async getAging(
    tenantId: string,
    branchId: string,
    startDate: string,
    endDate: string,
  ) {
    const cacheKey = `reports:aging:${tenantId}:${branchId}:${startDate}:${endDate}`;
    const cached = await this.cacheService.get<AgingData>(cacheKey);
    if (cached) return cached;

    const result = await this.reportsRepository.getAging(
      branchId,
      startDate,
      endDate,
    );
    await this.cacheService.set(cacheKey, result, 300_000);
    return result;
  }
}
