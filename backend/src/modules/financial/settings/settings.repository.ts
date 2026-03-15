import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async get(branchId: string) {
    this.drizzleService.getTenantDb();
    return {
      branchId,
      closingDay: 1,
      currency: 'BRL',
      alertDaysBefore: 3,
      emailAlerts: true,
      maxRefundDaysPayable: 90,
      maxRefundDaysReceivable: 180,
    };
  }

  async update(branchId: string, dto: UpdateSettingsDto) {
    this.drizzleService.getTenantDb();
    return { branchId, ...dto };
  }
}
