import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QueueService } from '../../infrastructure/queue/queue.service';

type EntryApprovedPayload = {
  tenantId: string;
  entryId: string;
  approverId: string;
};

type EntryRejectedPayload = {
  tenantId: string;
  entryId: string;
  approverId: string;
  reason?: string;
};

type PaymentCreatedPayload = {
  tenantId: string;
  branchId: string;
  entryId: string;
  amount: string;
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

  constructor(private readonly queueService: QueueService) {}

  @OnEvent('entry.approved')
  async onEntryApproved(payload: EntryApprovedPayload): Promise<void> {
    try {
      await this.queueService.add('financial.notifications', 'entry-approved', {
        tenantId: payload.tenantId,
        entryId: payload.entryId,
        approverId: payload.approverId,
        notificationType: 'ENTRY_APPROVED',
      });
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
      await this.queueService.add('financial.notifications', 'entry-rejected', {
        tenantId: payload.tenantId,
        entryId: payload.entryId,
        approverId: payload.approverId,
        reason: payload.reason ?? null,
        notificationType: 'ENTRY_REJECTED',
      });
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
          amount: payload.amount,
        },
      );
    } catch (error) {
      this.logger.error(
        `Falha ao enfileirar job de agradecimento para entry ${payload.entryId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
