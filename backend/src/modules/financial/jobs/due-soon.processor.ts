import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { TenantsService } from '../../tenants/tenants.service';
import { resolveTenantSchema } from './jobs.util';
import { quoteLiteral } from '../../../infrastructure/database/sql-builder.util';

@Injectable()
export class DueSoonProcessor implements OnModuleInit {
  private readonly logger = new Logger(DueSoonProcessor.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly drizzleService: DrizzleService,
    private readonly tenantsService: TenantsService,
  ) {}

  onModuleInit(): void {
    this.queueService.registerProcessor('financial.due-soon', async () => {
      // Iterate active tenants
      const tenants = await this.tenantsService.list();
      for (const t of tenants.filter((x) => x.active)) {
        try {
          const schema = resolveTenantSchema({ tenantId: t.id });

          // Get alert days from settings (default 3)
          const settingsRes: any = await this.drizzleService
            .getClient()
            .execute(
              sql.raw(`
            SELECT COALESCE(alert_days_before, 3)::int AS alert_days
            FROM ${schema}.financial_settings
            LIMIT 1
          `),
            );

          const alertDaysRaw = settingsRes?.rows?.[0]?.alert_days;
          const alertDays = Number.isFinite(Number(alertDaysRaw)) ? Number(alertDaysRaw) : 3;
          const intervalLiteral = quoteLiteral(`${alertDays} days`);

          const entriesRes: any = await this.drizzleService
            .getClient()
            .execute(
              sql.raw(`
            SELECT id, branch_id, type, document_number, amount::text AS amount, created_by
            FROM ${schema}.financial_entries
            WHERE due_date = CURRENT_DATE + INTERVAL ${intervalLiteral}
              AND status IN ('PENDING', 'PARTIAL')
              AND deleted_at IS NULL
          `),
            );

          const rows = Array.isArray(entriesRes?.rows) ? entriesRes.rows : [];
          for (const entry of rows) {
            this.queueService.add(
              'financial.notifications',
              'entry-due-soon',
              {
                tenantId: t.id,
                branchId: String(entry.branch_id),
                entryId: String(entry.id),
                entryType: String(entry.type),
                documentNumber: entry.document_number ?? null,
                amount: String(entry.amount ?? '0'),
                createdBy: String(entry.created_by ?? null),
                daysUntilDue: Number(alertDays),
                jobType: 'entry.due_soon',
              },
              { jobId: `notif.due_soon.${String(entry.id)}.${new Date().toISOString().slice(0,10)}` },
            );
          }
        } catch (e) {
          this.logger.error(
            `Erro no due-soon para tenant=${t.id}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    });
  }
}
