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
    this.queueService.registerProcessor('financial.sequences', async (payload) => {
      const schema = resolveTenantSchema(payload);
      const year =
        typeof payload.year === 'number' && Number.isFinite(payload.year)
          ? Number(payload.year)
          : new Date().getFullYear();
      const yearLiteral = quoteLiteral(year);

      for (const type of ['PAY', 'REC', 'TRF']) {
        await this.drizzleService.getClient().execute(sql.raw(`
          INSERT INTO ${schema}.document_sequences (sequence_year, doc_type, next_number)
          VALUES (${yearLiteral}, ${quoteLiteral(type)}, 1)
          ON CONFLICT (sequence_year, doc_type)
          DO NOTHING
        `));
      }
    });
  }
}
