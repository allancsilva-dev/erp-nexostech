import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { ClsService } from 'nestjs-cls';
import { DrizzleService } from '../database/drizzle.service';
import { EventBusService } from '../events/event-bus.service';

const POLL_INTERVAL_MS = 15_000;
const BATCH_SIZE = 100;
const CLEANUP_RETENTION_DAYS = 7;

type OutboxRow = {
  id: string;
  tenant_id: string;
  event_name: string;
  payload: Record<string, unknown>;
};

function getRows(result: unknown): Array<Record<string, unknown>> {
  if (!result || typeof result !== 'object' || !('rows' in result)) {
    return [];
  }

  const rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
}

@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private running = false;
  private stopSignal = false;

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly eventBus: EventBusService,
    private readonly clsService: ClsService,
  ) {}

  onModuleInit(): void {
    this.running = true;
    this.stopSignal = false;
    void this.loop();

    this.logger.log(
      `OutboxWorker iniciado - polling a cada ${POLL_INTERVAL_MS / 1000}s`,
    );
  }

  onModuleDestroy(): void {
    this.stopSignal = true;
  }

  private async loop(): Promise<void> {
    while (!this.stopSignal) {
      try {
        await this.processBatch();
        await this.cleanup();
      } catch (error) {
        this.logger.error(
          'Erro no ciclo de polling do outbox',
          error instanceof Error ? error.stack : String(error),
        );
      }

      await new Promise<void>((resolve) =>
        setTimeout(resolve, POLL_INTERVAL_MS),
      );
    }

    this.running = false;
  }

  private async processBatch(): Promise<void> {
    await this.drizzleService.transaction(async (tx) => {
      const result = await tx.execute(
        sql`
            SELECT id, tenant_id, event_name, payload
            FROM public.outbox_events
            WHERE processed_at IS NULL
            ORDER BY created_at ASC
            LIMIT ${BATCH_SIZE}
            FOR UPDATE SKIP LOCKED
          `,
      );

      const rows = getRows(result) as OutboxRow[];
      if (rows.length === 0) {
        return;
      }

      const processedIds: string[] = [];

      for (const row of rows) {
        try {
          const payload =
            row.payload &&
            typeof row.payload === 'object' &&
            !Array.isArray(row.payload)
              ? row.payload
              : {};

          this.clsService.run(() => {
            this.clsService.set('tenantId', row.tenant_id);

            if (
              typeof payload.tenantSchema === 'string' &&
              payload.tenantSchema.length > 0
            ) {
              this.clsService.set('tenantSchema', payload.tenantSchema);
            } else {
              this.logger.warn('Outbox event sem tenantSchema', {
                event: row.event_name,
                tenantId: row.tenant_id,
              });
            }

            this.eventBus.emit(row.event_name, {
              ...payload,
              tenantId: row.tenant_id,
            });
          });

          processedIds.push(row.id);
        } catch (error) {
          this.logger.error(
            `Falha ao emitir evento outbox: id=${row.id} event=${row.event_name}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      if (processedIds.length === 0) {
        return;
      }

      await tx.execute(
        sql`
          UPDATE public.outbox_events
          SET processed_at = NOW()
          WHERE id = ANY(${processedIds}::uuid[])
        `,
      );

      this.logger.debug(`Outbox: ${processedIds.length} eventos publicados`);
    });
  }

  private async cleanup(): Promise<void> {
    await this.drizzleService.getClient().execute(
      sql`
        DELETE FROM public.outbox_events
        WHERE processed_at IS NOT NULL
          AND created_at < NOW() - (${CLEANUP_RETENTION_DAYS} * INTERVAL '1 day')
      `,
    );
  }
}
