import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { NotificationsService } from './notifications.service';
import { resolveTenantSchema } from '../financial/jobs/jobs.util';

interface NotificationJobPayload {
  tenantId: string;
  branchId?: string | null;
  entryId?: string | null;
  jobType?: string;
  documentNumber?: string | null;
  amount?: string | null;
  entryType?: string | null;
  createdBy?: string | null;
  approverId?: string | null;
  daysUntilDue?: number | null;
  reason?: string | null;
  title?: string;
  message?: string;
}

@Injectable()
export class NotificationProcessor implements OnModuleInit {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.queueService.registerProcessor('financial.notifications', async (rawPayload) => {
      try {
        const payload = rawPayload as unknown as NotificationJobPayload;
        const schema = resolveTenantSchema(rawPayload as Record<string, unknown>);

        const jobType = payload.jobType;
        const entryId = payload.entryId ?? null;
        const entryType = payload.entryType ?? null;
        const branchId = payload.branchId ?? null;
        const createdBy = payload.createdBy ?? null;
        const approverId = payload.approverId ?? null;
        const daysUntilDue = payload.daysUntilDue ?? null;
        const doc = payload.documentNumber ?? 'Lançamento';
        const amount = payload.amount ?? '0,00';

        if (!jobType) {
          this.logger.warn('Skipping notification: missing jobType in payload');
          return;
        }

        let title = '';
        let message = '';
        let userId: string | null = null;

        switch (jobType) {
          case 'approval.approved':
            title = 'Lançamento aprovado';
            message = `${doc} foi aprovado e está pronto para pagamento.`;
            userId = createdBy;
            break;
          case 'approval.rejected':
            title = 'Lançamento rejeitado';
            message = `${doc} foi rejeitado. Motivo: ${payload.reason ?? 'não informado'}`;
            userId = createdBy;
            break;
          case 'payment.created':
            title = entryType === 'PAYABLE' ? 'Pagamento registrado' : 'Recebimento registrado';
            message = `Valor de R$ ${amount} registrado em ${doc}.`;
            userId = createdBy;
            break;
          case 'entry.overdue':
            title = entryType === 'PAYABLE' ? 'Conta a pagar vencida' : 'Conta a receber vencida';
            message = `${doc} venceu e requer atenção.`;
            userId = createdBy;
            break;
          case 'entry.due_soon':
            title = entryType === 'PAYABLE' ? 'Conta a pagar vence em breve' : 'Conta a receber vence em breve';
            message = `${doc} vence em ${daysUntilDue ?? '?'} dia(s).`;
            userId = createdBy;
            break;
          case 'approval.pending':
            title = 'Lançamento aguarda aprovação';
            message = `${doc} de R$ ${amount} aguarda sua aprovação.`;
            userId = approverId;
            break;
          default:
            title = payload.title ?? 'Notificação';
            message = payload.message ?? '';
            userId = createdBy;
            break;
        }

        if (!userId) {
          this.logger.warn(
            `Skipping notification: missing userId for jobType=${jobType} entryId=${entryId}`,
          );
          return;
        }

        await this.notificationsService.create(schema.replace(/"/g, ''), {
          userId,
          branchId,
          type: jobType,
          title,
          message,
          metadata: {
            entry_id: entryId ?? null,
            document_number: payload.documentNumber ?? null,
            amount,
            type: entryType,
          },
        });
      } catch (e) {
        this.logger.error(`Erro ao processar notification job: ${e instanceof Error ? e.stack : String(e)}`);
      }
    });
  }
}
