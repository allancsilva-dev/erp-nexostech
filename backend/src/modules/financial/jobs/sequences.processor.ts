import { Injectable, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { quoteLiteral } from '../../../infrastructure/database/sql-builder.util';
import { resolveTenantSchema } from './jobs.util';

@Injectable()
export class SequencesProcessor implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
    private readonly drizzleService: DrizzleService,
  ) {}

  onModuleInit(): void {
    this.queueService.registerProcessor(
      'financial.sequences',
      async (payload) => {
        const schema = resolveTenantSchema(payload);
        const branchId = typeof payload.branchId === 'string' ? payload.branchId : null;
        if (!branchId) {
          return;
        }

        const year =
          typeof payload.year === 'number' && Number.isFinite(payload.year)
            ? payload.year
            : new Date().getFullYear();

        for (const type of ['PAY', 'REC']) {
          await this.drizzleService.getClient().execute(
            sql.raw(`
          INSERT INTO ${schema}.document_sequences (branch_id, type, year, last_sequence)
          VALUES (${quoteLiteral(branchId)}, ${quoteLiteral(type)}, ${year}, 0)
          ON CONFLICT (branch_id, type, year)
          DO NOTHING
        `),
          );
        }
      },
    );
  }
}
