import { Injectable, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { resolveTenantSchema, optionalBranchClause } from './jobs.util';

@Injectable()
export class CollectionProcessor implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
    private readonly drizzleService: DrizzleService,
  ) {}

  onModuleInit(): void {
    this.queueService.registerProcessor('financial.collection', async (payload) => {
      const schema = resolveTenantSchema(payload);
      const branchClause = optionalBranchClause(payload, 'e.branch_id');

      await this.drizzleService.getClient().execute(sql.raw(`
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
      `));
    });
  }
}
