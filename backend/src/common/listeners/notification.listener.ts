import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import { sql } from 'drizzle-orm';
import { resolveTenantSchema } from '../../modules/financial/jobs/jobs.util';
import { quoteLiteral } from '../../infrastructure/database/sql-builder.util';

type EntryApprovedPayload = {
  tenantId: string;
  branchId?: string;
  entryId: string;
  approverId?: string;
  documentNumber?: string | null;
  amount?: string;
  createdBy?: string;
};

type EntryRejectedPayload = {
  tenantId: string;
  branchId?: string;
  entryId: string;
  approverId?: string;
  reason?: string;
  documentNumber?: string | null;
  amount?: string;
  createdBy?: string;
};

type PaymentCreatedPayload = {
  tenantId: string;
  branchId?: string;
  entryId: string;
  paymentId?: string;
  amount?: string;
  documentNumber?: string | null;
  createdBy?: string;
  createdAt?: string;
};

type OverduePayload = {
  tenantId: string;
  branchId?: string;
  entryId: string;
  entryType?: string;
  documentNumber?: string | null;
  amount?: string;
  createdBy?: string;
};

type DueSoonPayload = OverduePayload & { daysUntilDue?: number };

type PendingApprovalPayload = {
  tenantId: string;
  branchId?: string;
  entryId: string;
  entryType?: string;
  documentNumber?: string | null;
  amount?: string;
  createdBy?: string;
};

/**
 * Listener de notificações.
 *
 * Escuta eventos de negócio e enfileira jobs para processamento assíncrono:
 * - entry.approved / entry.rejected → notificação ao criador do lançamento
 * - payment.created → job de agradecimento pós-pagamento
 *
 * NÃO envia e-mail diretamente — delega para os jobs para garantir
 * retry automático e desacoplamento do fluxo principal.
 */
@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly drizzleService: DrizzleService,
  ) {}
  @OnEvent('entry.approved')
  async onEntryApproved(payload: EntryApprovedPayload): Promise<void> {
    try {
      // Enrich payload if necessary (single query)
      const schema = resolveTenantSchema(payload as Record<string, unknown>);
      if (!payload.documentNumber || !payload.branchId || !payload.amount || !payload.createdBy) {
        this.logger.warn(
          `[entry.approved] Payload incompleto para entry ${payload.entryId} - acionando fallback de enriquecimento`,
        );
        const entryIdLiteral = quoteLiteral(payload.entryId);
        const row: any = (
          await this.drizzleService.getClient().execute(
            sql.raw(`
          SELECT branch_id, document_number, amount::text AS amount, created_by
          FROM ${schema}.financial_entries
          WHERE id = ${entryIdLiteral}
          LIMIT 1
        `),
          )
        ).rows[0];

        if (row) {
          payload.branchId = payload.branchId ?? String(row.branch_id);
          payload.documentNumber = payload.documentNumber ?? (row.document_number ?? null);
          payload.amount = payload.amount ?? String(row.amount ?? '0');
          payload.createdBy = payload.createdBy ?? String(row.created_by ?? '');
        }
      }

      await this.queueService.add(
        'financial.notifications',
        'entry-approved',
        {
          tenantId: payload.tenantId,
          branchId: payload.branchId,
          entryId: payload.entryId,
          documentNumber: payload.documentNumber ?? null,
          amount: payload.amount ?? null,
          createdBy: payload.createdBy ?? null,
          jobType: 'approval.approved',
        },
        { jobId: `notif.approved.${payload.entryId}` },
      );
    } catch (error) {
      // Falha de notificação não deve bloquear o fluxo principal
      this.logger.error(
        `Falha ao enfileirar notificação de aprovação para entry ${payload.entryId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @OnEvent('entry.rejected')
  async onEntryRejected(payload: EntryRejectedPayload): Promise<void> {
    try {
      const schema = resolveTenantSchema(payload as Record<string, unknown>);
      if (!payload.documentNumber || !payload.branchId || !payload.amount || !payload.createdBy) {
        this.logger.warn(
          `[entry.rejected] Payload incompleto para entry ${payload.entryId} - acionando fallback de enriquecimento`,
        );
        const entryIdLiteral = quoteLiteral(payload.entryId);
        const row: any = (
          await this.drizzleService.getClient().execute(
            sql.raw(`
          SELECT branch_id, document_number, amount::text AS amount, created_by
          FROM ${schema}.financial_entries
          WHERE id = ${entryIdLiteral}
          LIMIT 1
        `),
          )
        ).rows[0];

        if (row) {
          payload.branchId = payload.branchId ?? String(row.branch_id);
          payload.documentNumber = payload.documentNumber ?? (row.document_number ?? null);
          payload.amount = payload.amount ?? String(row.amount ?? '0');
          payload.createdBy = payload.createdBy ?? String(row.created_by ?? '');
        }
      }

      await this.queueService.add(
        'financial.notifications',
        'entry-rejected',
        {
          tenantId: payload.tenantId,
          branchId: payload.branchId,
          entryId: payload.entryId,
          documentNumber: payload.documentNumber ?? null,
          amount: payload.amount ?? null,
          createdBy: payload.createdBy ?? null,
          reason: payload.reason ?? null,
          jobType: 'approval.rejected',
        },
        { jobId: `notif.rejected.${payload.entryId}` },
      );
    } catch (error) {
      this.logger.error(
        `Falha ao enfileirar notificação de rejeição para entry ${payload.entryId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @OnEvent('payment.created')
  async onPaymentCreated(payload: PaymentCreatedPayload): Promise<void> {
    try {
      // Enfileira job de agradecimento pós-pagamento
      await this.queueService.add(
        'financial.payment-thanks',
        'payment-thanks',
        {
          tenantId: payload.tenantId,
          branchId: payload.branchId,
          entryId: payload.entryId,
          paymentId: payload.paymentId ?? null,
          amount: payload.amount ?? null,
        },
        { jobId: `notif.payment.${payload.entryId}.${payload.paymentId ?? payload.createdAt ?? ''}` },
      );
    } catch (error) {
      this.logger.error(
        `Falha ao enfileirar job de agradecimento para entry ${payload.entryId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @OnEvent('entry.overdue')
  async onEntryOverdue(payload: OverduePayload): Promise<void> {
    try {
      const schema = resolveTenantSchema(payload as Record<string, unknown>);
      if (!payload.documentNumber || !payload.branchId || !payload.amount || !payload.createdBy || !payload.entryType) {
        const entryIdLiteral = quoteLiteral(payload.entryId);
        const row: any = (
          await this.drizzleService.getClient().execute(
            sql.raw(`
          SELECT branch_id, document_number, amount::text AS amount, created_by, type
          FROM ${schema}.financial_entries
          WHERE id = ${entryIdLiteral}
          LIMIT 1
        `),
          )
        ).rows[0];

        if (row) {
          payload.branchId = payload.branchId ?? String(row.branch_id);
          payload.documentNumber = payload.documentNumber ?? (row.document_number ?? null);
          payload.amount = payload.amount ?? String(row.amount ?? '0');
          payload.createdBy = payload.createdBy ?? String(row.created_by ?? '');
          payload.entryType = payload.entryType ?? String(row.type ?? 'PAYABLE');
        }
      }

      await this.queueService.add(
        'financial.notifications',
        'entry-overdue',
        {
          tenantId: payload.tenantId,
          branchId: payload.branchId,
          entryId: payload.entryId,
          entryType: payload.entryType,
          documentNumber: payload.documentNumber ?? null,
          amount: payload.amount ?? null,
          createdBy: payload.createdBy ?? null,
          jobType: 'entry.overdue',
        },
        { jobId: `notif.overdue.${payload.entryId}.${new Date().toISOString().slice(0,10)}` },
      );
    } catch (error) {
      this.logger.error(
        `Falha ao enfileirar notificação overdue para entry ${payload.entryId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @OnEvent('entry.due_soon')
  async onEntryDueSoon(payload: DueSoonPayload): Promise<void> {
    try {
      const schema = resolveTenantSchema(payload as Record<string, unknown>);
      if (!payload.documentNumber || !payload.branchId || !payload.amount || !payload.createdBy || !payload.entryType) {
        const entryIdLiteral = quoteLiteral(payload.entryId);
        const row: any = (
          await this.drizzleService.getClient().execute(
            sql.raw(`
          SELECT branch_id, document_number, amount::text AS amount, created_by, type
          FROM ${schema}.financial_entries
          WHERE id = ${entryIdLiteral}
          LIMIT 1
        `),
          )
        ).rows[0];

        if (row) {
          payload.branchId = payload.branchId ?? String(row.branch_id);
          payload.documentNumber = payload.documentNumber ?? (row.document_number ?? null);
          payload.amount = payload.amount ?? String(row.amount ?? '0');
          payload.createdBy = payload.createdBy ?? String(row.created_by ?? '');
          payload.entryType = payload.entryType ?? String(row.type ?? 'PAYABLE');
        }
      }

      await this.queueService.add(
        'financial.notifications',
        'entry-due-soon',
        {
          tenantId: payload.tenantId,
          branchId: payload.branchId,
          entryId: payload.entryId,
          entryType: payload.entryType,
          documentNumber: payload.documentNumber ?? null,
          amount: payload.amount ?? null,
          createdBy: payload.createdBy ?? null,
          daysUntilDue: payload.daysUntilDue ?? null,
          jobType: 'entry.due_soon',
        },
        { jobId: `notif.due_soon.${payload.entryId}.${new Date().toISOString().slice(0,10)}` },
      );
    } catch (error) {
      this.logger.error(
        `Falha ao enfileirar notificação due_soon para entry ${payload.entryId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @OnEvent('entry.pending_approval')
  async onEntryPendingApproval(payload: PendingApprovalPayload): Promise<void> {
    try {
      const schema = resolveTenantSchema(payload as Record<string, unknown>);
      if (!payload.branchId) {
        this.logger.error(
          `[entry.pending_approval] branchId ausente no payload para entry ${payload.entryId} - abortando notificação`,
        );
        return;
      }

      const branchLiteral = quoteLiteral(payload.branchId);
      const rows: any = (
        await this.drizzleService.getClient().execute(
          sql.raw(`
        SELECT DISTINCT ur.user_id
        FROM ${schema}.user_roles ur
        JOIN ${schema}.role_permissions rp ON rp.role_id = ur.role_id
        JOIN ${schema}.user_branches ub ON ub.user_id = ur.user_id
        WHERE rp.permission_code = 'financial.entries.approve'
          AND ur.deleted_at IS NULL
          AND ub.branch_id = ${branchLiteral}::uuid
      `),
        )
      ).rows as Array<Record<string, unknown>>;

      for (const r of rows) {
        const approverId = String(r.user_id);
        await this.queueService.add(
          'financial.notifications',
          'approval-pending',
          {
            tenantId: payload.tenantId,
            branchId: payload.branchId ?? null,
            entryId: payload.entryId,
            entryType: payload.entryType ?? null,
            documentNumber: payload.documentNumber ?? null,
            amount: payload.amount ?? null,
            createdBy: payload.createdBy ?? null,
            approverId,
            jobType: 'approval.pending',
          },
          { jobId: `notif.pending.${payload.entryId}.${approverId}` },
        );
      }
    } catch (error) {
      this.logger.error(
        `Falha ao enfileirar notificação pending approval para entry ${payload.entryId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
