import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { resolveTenantSchema } from './jobs.util';

function getRows(result: unknown): Array<Record<string, unknown>> {
  if (!result || typeof result !== 'object' || !('rows' in result)) {
    return [];
  }

  const rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
}

/**
 * Job de limpeza semanal (domingo 03:00).
 *
 * Responsabilidades:
 * 1. Remove registros soft-deleted mais antigos que 90 dias (categorias, contatos, entries)
 *    para manter a base de dados enxuta.
 * 2. Limpa dispatches de cobrança com status SENT ou FAILED com mais de 180 dias.
 * 3. Loga o resumo do cleanup para auditoria.
 *
 * Idempotente: pode ser executado múltiplas vezes sem efeito colateral.
 */
@Injectable()
export class CleanupProcessor implements OnModuleInit {
  private readonly logger = new Logger(CleanupProcessor.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly drizzleService: DrizzleService,
  ) {}

  onModuleInit(): void {
    this.queueService.registerProcessor(
      'financial.cleanup',
      async (payload) => {
        const schema = resolveTenantSchema(payload);

        const summary: Record<string, number> = {};

        summary['categories_purged'] = await this.deleteBatch(
          schema,
          'categories',
          `deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days'`,
        );

        summary['contacts_purged'] = await this.deleteBatch(
          schema,
          'contacts',
          `deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days'`,
        );

        summary['collection_dispatches_purged'] = await this.deleteBatch(
          schema,
          'collection_dispatches',
          `status IN ('SENT', 'FAILED') AND scheduled_for < NOW() - INTERVAL '180 days'`,
        );

        summary['audit_logs_purged'] = await this.deleteBatch(
          schema,
          'audit_logs',
          `created_at < NOW() - INTERVAL '5 years'`,
        );

        this.logger.log(
          `cleanup concluído para schema=${schema.replace(/"/g, '')}: ${JSON.stringify(summary)}`,
        );
      },
    );
  }

  private async deleteBatch(schema: string, table: string, where: string): Promise<number> {
    let total = 0;

    while (true) {
      const result: unknown = await this.drizzleService.getClient().execute(
        sql.raw(`
          DELETE FROM ${schema}.${table}
          WHERE ctid IN (
            SELECT ctid FROM ${schema}.${table}
            WHERE ${where}
            LIMIT 500
          )
          RETURNING 1
        `),
      );

      const count = getRows(result).length;
      total += count;
      if (count < 500) {
        break;
      }
    }

    return total;
  }
}
