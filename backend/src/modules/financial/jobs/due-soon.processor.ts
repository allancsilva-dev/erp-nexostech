import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { TenantsService } from '../../tenants/tenants.service';
import { resolveTenantSchema } from './jobs.util';

type TenantEntity = { id: string; active: boolean };

@Injectable()
export class DueSoonProcessor implements OnModuleInit {
  private readonly logger = new Logger(DueSoonProcessor.name);
  private static readonly CONCURRENCY = 5;

  constructor(
    private readonly queueService: QueueService,
    private readonly drizzleService: DrizzleService,
    private readonly tenantsService: TenantsService,
  ) {}

  onModuleInit(): void {
    this.queueService.registerProcessor(
      'financial.due-soon',
      async () => {
        const tenants = await this.tenantsService.list();
        const active = tenants.filter((tenant) => tenant.active);

        this.logger.log(
          `due-soon: processando ${active.length} tenants em chunks de ${DueSoonProcessor.CONCURRENCY}`,
        );

        for (let index = 0; index < active.length; index += DueSoonProcessor.CONCURRENCY) {
          const chunk = active.slice(index, index + DueSoonProcessor.CONCURRENCY);
          await Promise.all(
            chunk.map((tenant) => this.processTenant(tenant)),
          );
        }
      },
      { concurrency: 1 },
    );
  }

  private async processTenant(tenant: TenantEntity): Promise<void> {
    try {
      const schema = resolveTenantSchema({ tenantId: tenant.id });

      const settingsRes = await this.drizzleService.getClient().execute(
        sql.raw(`
          SELECT COALESCE(alert_days_before, 3)::int AS alert_days
          FROM ${schema}.financial_settings
          LIMIT 1
        `),
      );

      const alertDaysRaw = (settingsRes?.rows?.[0] as Record<string, unknown> | undefined)
        ?.alert_days;
      const alertDays = Number.isFinite(Number(alertDaysRaw))
        ? Number(alertDaysRaw)
        : 3;

      const entriesRes = await this.drizzleService.getClient().execute(
        sql`
          SELECT id, branch_id, type, document_number, amount::text AS amount, created_by
          FROM ${sql.raw(`${schema}.financial_entries`)}
          WHERE due_date = CURRENT_DATE + (${alertDays} * INTERVAL '1 day')
            AND status IN ('PENDING', 'PARTIAL')
            AND deleted_at IS NULL
        `,
      );

      const rows = Array.isArray(entriesRes?.rows)
        ? (entriesRes.rows as Array<Record<string, unknown>>)
        : [];

      const today = new Date().toLocaleDateString('en-CA');
      await Promise.all(
        rows.map((entry) =>
          this.queueService.add(
            'financial.notifications',
            'entry-due-soon',
            {
              tenantId: tenant.id,
              branchId: String(entry.branch_id),
              entryId: String(entry.id),
              entryType: String(entry.type),
              documentNumber: entry.document_number ?? null,
              amount: String(entry.amount ?? '0'),
              createdBy: String(entry.created_by ?? null),
              daysUntilDue: alertDays,
              jobType: 'entry.due_soon',
            },
            {
              jobId: `notif.due_soon.${String(entry.id)}.${today}`,
            },
          ),
        ),
      );

      this.logger.debug(
        `due-soon: tenant=${tenant.id} - ${rows.length} entries enfileiradas`,
      );
    } catch (error) {
      this.logger.error(
        `Erro no due-soon para tenant=${tenant.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
