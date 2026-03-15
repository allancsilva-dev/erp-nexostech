import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';

@Injectable()
export class ReportsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async getDre(_branchId: string, _startDate: string, _endDate: string) {
    this.drizzleService.getTenantDb();
    return { revenueTotal: '0.00', expenseTotal: '0.00' };
  }

  async getCashflow(_branchId: string, _startDate: string, _endDate: string) {
    this.drizzleService.getTenantDb();
    return {
      startBalance: '0.00',
      rows: [] as Array<{ date: string; inflow: string; outflow: string }>,
    };
  }
}
