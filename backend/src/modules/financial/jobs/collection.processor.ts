import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { resolveTenantSchema, optionalBranchClause } from './jobs.util';

@Injectable()
export class CollectionProcessor implements OnModuleInit {
  private readonly logger = new Logger(CollectionProcessor.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly drizzleService: DrizzleService,
  ) {}

  onModuleInit(): void {
    this.queueService.registerProcessor(
      'financial.collection',
      async (payload) => {
        const payloadRecord =
          payload && typeof payload === 'object' ? payload : {};
        const jobId =
          typeof payloadRecord.jobId === 'string'
            ? payloadRecord.jobId
            : randomUUID();
        const tenantId =
          typeof payloadRecord.tenantId === 'string'
            ? payloadRecord.tenantId
            : 'unknown';
        const branchId =
          typeof payloadRecord.branchId === 'string'
            ? payloadRecord.branchId
            : 'all';

        this.logger.log({
          message: 'collection.job.started',
          jobId,
          tenantId,
          branchId,
          date: new Date().toISOString(),
        });

        const schema = resolveTenantSchema(payloadRecord);
        const branchClause = optionalBranchClause(payload, 'e.branch_id');

        try {
          const result = await this.drizzleService.getClient().execute(
            sql.raw(`
        INSERT INTO ${schema}.collection_dispatches (
          rule_id, entry_id, branch_id, email_template_id, channel, dispatch_date, status, scheduled_for
        )
        SELECT
          r.id,
          e.id,
          e.branch_id,
          r.email_template_id,
          'EMAIL',
          CURRENT_DATE,
          'PENDING',
          NOW()
        FROM ${schema}.financial_entries e
        JOIN ${schema}.collection_rules r
          ON r.branch_id = e.branch_id
         AND r.active = true
         AND r.deleted_at IS NULL
        WHERE e.deleted_at IS NULL
          AND e.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
          ${branchClause}
          AND (
            (r.event = 'ON_DUE' AND e.due_date = CURRENT_DATE)
            OR (r.event = 'BEFORE_DUE' AND e.due_date - (r.days_offset * INTERVAL '1 day') = CURRENT_DATE)
            OR (r.event = 'AFTER_DUE' AND e.due_date + (r.days_offset * INTERVAL '1 day') <= CURRENT_DATE)
          )
        ON CONFLICT (rule_id, entry_id, dispatch_date)
        DO NOTHING
      `),
          );

          const dispatchesCreated =
            typeof result.rowCount === 'number'
              ? result.rowCount
              : result.rows.length;

          this.logger.log({
            message: 'collection.job.completed',
            jobId,
            tenantId,
            branchId,
            dispatchesCreated,
            date: new Date().toISOString(),
          });
        } catch (error) {
          this.logger.error({
            message: 'collection.job.failed',
            jobId,
            tenantId,
            branchId,
            error: error instanceof Error ? error.message : String(error),
            date: new Date().toISOString(),
          });
          throw error;
        }
      },
    );
  }
}
