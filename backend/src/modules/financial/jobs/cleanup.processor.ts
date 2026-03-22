import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { resolveTenantSchema } from './jobs.util';
import { quoteIdent } from '../../../infrastructure/database/sql-builder.util';

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
        const schemaName = quoteIdent(schema.replace(/"/g, ''));

        const summary: Record<string, number> = {};

        // 1. Limpa soft-deleted de categorias (> 90 dias)
        const cats: unknown = await this.drizzleService.getClient().execute(
          sql.raw(`
          DELETE FROM ${schemaName}.categories
          WHERE deleted_at IS NOT NULL
            AND deleted_at < NOW() - INTERVAL '90 days'
          RETURNING id
        `),
        );
        summary['categories_purged'] = getRows(cats).length;

        // 2. Limpa soft-deleted de contatos (> 90 dias)
        const contacts: unknown = await this.drizzleService.getClient().execute(
          sql.raw(`
          DELETE FROM ${schemaName}.contacts
          WHERE deleted_at IS NOT NULL
            AND deleted_at < NOW() - INTERVAL '90 days'
          RETURNING id
        `),
        );
        summary['contacts_purged'] = getRows(contacts).length;

        // 3. Limpa dispatches de cobrança antigos (SENT ou FAILED, > 180 dias)
        const dispatches: unknown = await this.drizzleService
          .getClient()
          .execute(
            sql.raw(`
          DELETE FROM ${schemaName}.collection_dispatches
          WHERE status IN ('SENT', 'FAILED')
            AND scheduled_for < NOW() - INTERVAL '180 days'
          RETURNING id
        `),
          );
        summary['collection_dispatches_purged'] = getRows(dispatches).length;

        // 4. Limpa audit_logs mais antigos que 2 anos (retenção LGPD)
        const logs: unknown = await this.drizzleService.getClient().execute(
          sql.raw(`
          DELETE FROM ${schemaName}.audit_logs
          WHERE created_at < NOW() - INTERVAL '2 years'
          RETURNING id
        `),
        );
        summary['audit_logs_purged'] = getRows(logs).length;

        this.logger.log(
          `cleanup concluído para schema=${schema.replace(/"/g, '')}: ${JSON.stringify(summary)}`,
        );
      },
    );
  }
}
