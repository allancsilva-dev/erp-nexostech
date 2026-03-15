import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async get(branchId: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT branch_id, closing_day, currency, alert_days_before, email_alerts,
             max_refund_days_payable, max_refund_days_receivable
      FROM ${schema}.financial_settings
      WHERE branch_id = ${branchLiteral}
      LIMIT 1
    `),
    );

    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
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

    return {
      branchId: String(row.branch_id),
      closingDay: Number(row.closing_day),
      currency: String(row.currency),
      alertDaysBefore: Number(row.alert_days_before),
      emailAlerts: Boolean(row.email_alerts),
      maxRefundDaysPayable: Number(row.max_refund_days_payable),
      maxRefundDaysReceivable: Number(row.max_refund_days_receivable),
    };
  }

  async update(branchId: string, dto: UpdateSettingsDto) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const closingDayLiteral = quoteLiteral(dto.closingDay);
    const currencyLiteral = quoteLiteral(dto.currency);
    const alertDaysBeforeLiteral = quoteLiteral(dto.alertDaysBefore);
    const emailAlertsLiteral = quoteLiteral(dto.emailAlerts);
    const maxRefundPayableLiteral = quoteLiteral(dto.maxRefundDaysPayable);
    const maxRefundReceivableLiteral = quoteLiteral(
      dto.maxRefundDaysReceivable,
    );

    await this.drizzleService.getClient().execute(
      sql.raw(`
      INSERT INTO ${schema}.financial_settings (
        branch_id,
        closing_day,
        currency,
        alert_days_before,
        email_alerts,
        max_refund_days_payable,
        max_refund_days_receivable
      ) VALUES (
        ${branchLiteral},
        ${closingDayLiteral},
        ${currencyLiteral},
        ${alertDaysBeforeLiteral},
        ${emailAlertsLiteral},
        ${maxRefundPayableLiteral},
        ${maxRefundReceivableLiteral}
      )
      ON CONFLICT (branch_id)
      DO UPDATE SET
        closing_day = EXCLUDED.closing_day,
        currency = EXCLUDED.currency,
        alert_days_before = EXCLUDED.alert_days_before,
        email_alerts = EXCLUDED.email_alerts,
        max_refund_days_payable = EXCLUDED.max_refund_days_payable,
        max_refund_days_receivable = EXCLUDED.max_refund_days_receivable,
        updated_at = NOW()
    `),
    );

    return this.get(branchId);
  }
}
