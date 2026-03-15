import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';

export type DashboardSummary = {
  currentBalance: string;
  totalReceivable30d: string;
  totalPayable30d: string;
  monthResult: string;
};

@Injectable()
export class DashboardRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async getSummary(_branchId: string): Promise<DashboardSummary> {
    this.drizzleService.getTenantDb();
    return {
      currentBalance: '0.00',
      totalReceivable30d: '0.00',
      totalPayable30d: '0.00',
      monthResult: '0.00',
    };
  }

  async getOverdue(_branchId: string): Promise<Array<{ id: string; description: string; amount: string }>> {
    this.drizzleService.getTenantDb();
    return [];
  }

  async getCashflowChart(
    _branchId: string,
    _period: string,
  ): Promise<Array<{ month: string; inflow: string; outflow: string }>> {
    this.drizzleService.getTenantDb();
    return [];
  }
}
