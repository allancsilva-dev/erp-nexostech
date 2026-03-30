import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import { NotificationsService } from './notifications.service';
import { resolveTenantSchema } from '../financial/jobs/jobs.util';
import { quoteLiteral } from '../../infrastructure/database/sql-builder.util';

@Injectable()
export class NotificationProcessor implements OnModuleInit {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly drizzle: DrizzleService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.queueService.registerProcessor('financial.notifications', async (payload) => {
      try {
        const schema = resolveTenantSchema(payload as Record<string, unknown>);
        const jobType = (payload as any).jobType as string | undefined;
        const entryId = (payload as any).entryId as string | undefined;
        const documentNumber = (payload as any).documentNumber ?? null;
        const amount = (payload as any).amount ?? null;
        const entryType = (payload as any).entryType ?? null;
        const branchId = (payload as any).branchId ?? null;
        const createdBy = (payload as any).createdBy ?? null;
        const approverId = (payload as any).approverId ?? null;
        const daysUntilDue = (payload as any).daysUntilDue ?? null;
        const jobId = (payload as any).jobId ?? null;

        let title = '';
        let message = '';
        let userId: string | null = null;

        switch (jobType) {
          case 'approval.approved':
            title = 'Lançamento aprovado';
            message = `${documentNumber} foi aprovado e está pronto para pagamento.`;
            userId = createdBy;
            break;
          case 'approval.rejected':
            title = 'Lançamento rejeitado';
            message = `${documentNumber} foi rejeitado. Motivo: ${(payload as any).reason ?? ''}`;
            userId = createdBy;
            break;
          case 'payment.created':
            title = (entryType === 'PAYABLE') ? 'Pagamento registrado' : 'Recebimento registrado';
            message = `Valor de R$ ${amount} registrado em ${documentNumber}.`;
            userId = createdBy;
            break;
          case 'entry.overdue':
            title = (entryType === 'PAYABLE') ? 'Conta a pagar vencida' : 'Conta a receber vencida';
            message = `${documentNumber} venceu e requer atenção.`;
            userId = createdBy;
            break;
          case 'entry.due_soon':
            title = (entryType === 'PAYABLE') ? 'Conta a pagar vence em breve' : 'Conta a receber vence em breve';
            message = `${documentNumber} vence em ${daysUntilDue} dia(s).`;
            userId = createdBy;
            break;
          case 'approval.pending':
            title = 'Lançamento aguarda aprovação';
            message = `${documentNumber} de R$ ${amount} aguarda sua aprovação.`;
            userId = approverId as string | null;
            break;
          default:
            title = (payload as any).title ?? 'Notificação';
            message = (payload as any).message ?? '';
            userId = createdBy;
            break;
        }

        // The notifications table requires a non-null user_id (per migration).
        // If the job doesn't target a specific user, skip persisting and log.
        if (!userId) {
          this.logger.warn('Skipping notification: missing userId in payload', JSON.stringify(payload));
          return;
        }

        await this.notificationsService.create(schema.replace(/"/g, ''), {
          userId: userId as string | null,
          branchId: branchId as string | null,
          type: jobType ?? 'generic',
          title,
          message,
          metadata: {
            entry_id: entryId ?? null,
            document_number: documentNumber,
            amount,
            type: entryType,
            job_id: jobId ?? null,
          },
          jobId: jobId ?? null,
        });
      } catch (e) {
        this.logger.error(`Erro ao processar notification job: ${e instanceof Error ? e.stack : String(e)}`);
      }
    });
  }
}
