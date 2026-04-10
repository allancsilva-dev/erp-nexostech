import { Injectable, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { EventBusService } from '../../../infrastructure/events/event-bus.service';
import { resolveTenantSchema, optionalBranchClause } from './jobs.util';

@Injectable()
export class OverdueProcessor implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
    private readonly drizzleService: DrizzleService,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit(): void {
    this.queueService.registerProcessor(
      'financial.overdue',
      async (payload) => {
        const schema = resolveTenantSchema(payload);
        const branchClause = optionalBranchClause(payload);

        const result: unknown = await this.drizzleService.getClient().execute(
          sql.raw(`
              UPDATE ${schema}.financial_entries
              SET status = 'OVERDUE', updated_at = NOW()
              WHERE due_date < CURRENT_DATE
                AND status IN ('PENDING', 'PARTIAL')
                AND deleted_at IS NULL
                ${branchClause}
              RETURNING id, branch_id, type, document_number, amount::text AS amount, created_by
            `),
        );

        const rows = Array.isArray((result as { rows?: unknown })?.rows)
          ? ((result as { rows: unknown[] }).rows as Array<
              Record<string, unknown>
            >)
          : [];

        for (const entry of rows) {
          const amount =
            typeof entry.amount === 'string' || typeof entry.amount === 'number'
              ? String(entry.amount)
              : '0';
          const createdBy =
            typeof entry.created_by === 'string' ||
            typeof entry.created_by === 'number'
              ? String(entry.created_by)
              : 'null';

          this.eventBus.emit('entry.overdue', {
            tenantId: payload.tenantId,
            tenantSchema: payload.tenantSchema,
            branchId: String(entry.branch_id),
            entryId: String(entry.id),
            entryType: String(entry.type),
            documentNumber: entry.document_number ?? null,
            amount,
            createdBy,
          });
        }
      },
    );
  }
}
