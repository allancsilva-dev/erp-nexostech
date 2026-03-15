import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../infrastructure/database/sql-builder.util';

type AuditableEvent = {
  tenantId: string;
  branchId?: string;
  entityId?: string;
  userId?: string;
  eventId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Listener de audit log para eventos de negócio que ocorrem FORA do contexto HTTP
 * (jobs background, automações, etc.). Eventos HTTP já são capturados pelo AuditInterceptor.
 *
 * Idempotente: usa eventId para evitar duplicidade em caso de retry.
 * Falha silenciosa: erros de audit não bloqueiam o fluxo principal.
 */
@Injectable()
export class AuditLogListener {
  private readonly logger = new Logger(AuditLogListener.name);

  constructor(private readonly drizzleService: DrizzleService) {}

  @OnEvent('entry.created')
  async onEntryCreated(payload: AuditableEvent & { type?: string }): Promise<void> {
    await this.writeAuditLog('CREATE', 'financial_entries', payload);
  }

  @OnEvent('entry.updated')
  async onEntryUpdated(payload: AuditableEvent): Promise<void> {
    await this.writeAuditLog('UPDATE', 'financial_entries', payload);
  }

  @OnEvent('entry.cancelled')
  async onEntryCancelled(payload: AuditableEvent & { reason?: string }): Promise<void> {
    await this.writeAuditLog('CANCEL', 'financial_entries', payload);
  }

  @OnEvent('entry.deleted')
  async onEntryDeleted(payload: AuditableEvent): Promise<void> {
    await this.writeAuditLog('DELETE', 'financial_entries', payload);
  }

  @OnEvent('entry.restored')
  async onEntryRestored(payload: AuditableEvent): Promise<void> {
    await this.writeAuditLog('RESTORE', 'financial_entries', payload);
  }

  @OnEvent('payment.created')
  async onPaymentCreated(payload: AuditableEvent & { amount?: string }): Promise<void> {
    await this.writeAuditLog('PAY', 'financial_entry_payments', payload);
  }

  @OnEvent('payment.refunded')
  async onPaymentRefunded(payload: AuditableEvent & { amount?: string }): Promise<void> {
    await this.writeAuditLog('REFUND', 'financial_entry_payments', payload);
  }

  @OnEvent('reconciliation.matched')
  async onReconciliationMatched(payload: AuditableEvent & { itemId?: string }): Promise<void> {
    await this.writeAuditLog('RECONCILE', 'reconciliation_items', {
      ...payload,
      entityId: payload.itemId ?? payload.entityId,
    });
  }

  private async writeAuditLog(
    action: string,
    entity: string,
    payload: AuditableEvent,
  ): Promise<void> {
    try {
      if (!payload.tenantId) return;

      const schema = quoteIdent(`tenant_${payload.tenantId.replace(/[^a-zA-Z0-9_]/g, '_')}`);
      const eventId = payload.eventId ?? null;

      // Idempotência: verifica se já foi processado (evita duplicidade em retries)
      if (eventId) {
        const exists = await this.drizzleService.getClient().execute(
          sql.raw(`
          SELECT 1 FROM ${schema}.audit_logs
          WHERE metadata->>'eventId' = ${quoteLiteral(eventId)}
          LIMIT 1
        `),
        );
        if (exists.rows.length > 0) {
          return; // Já processado
        }
      }

      const metadata = JSON.stringify({
        eventId,
        source: 'event-listener',
        ...(payload.metadata ?? {}),
      });

      await this.drizzleService.getClient().execute(
        sql.raw(`
        INSERT INTO ${schema}.audit_logs (
          branch_id,
          user_id,
          action,
          entity,
          entity_id,
          metadata
        ) VALUES (
          ${quoteLiteral(payload.branchId ?? null)},
          ${quoteLiteral(payload.userId ?? 'system')},
          ${quoteLiteral(action)},
          ${quoteLiteral(entity)},
          ${quoteLiteral(payload.entityId ?? null)},
          ${quoteLiteral(metadata)}::jsonb
        )
      `),
      );
    } catch (error) {
      // Audit é crítico mas não deve bloquear operações. Logar e continuar.
      this.logger.error(
        `Falha ao gravar audit log (action=${action}, entity=${entity}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
