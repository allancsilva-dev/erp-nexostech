import { Injectable, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { resolveTenantSchema, optionalBranchClause } from './jobs.util';

@Injectable()
export class OverdueProcessor implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
    private readonly drizzleService: DrizzleService,
  ) {}

  onModuleInit(): void {
    this.queueService.registerProcessor(
      'financial.overdue',
      async (payload) => {
        const schema = resolveTenantSchema(payload);
        const branchClause = optionalBranchClause(payload);

        await this.drizzleService.getClient().execute(
          sql.raw(`
        UPDATE ${schema}.financial_entries
        SET status = 'OVERDUE', updated_at = NOW()
        WHERE due_date < CURRENT_DATE
          AND status IN ('PENDING', 'PARTIAL')
          AND deleted_at IS NULL
          ${branchClause}
      `),
        );
      },
    );
  }
}
