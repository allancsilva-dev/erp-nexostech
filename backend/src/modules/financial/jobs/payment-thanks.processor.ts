import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { resolveTenantSchema } from './jobs.util';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';

/**
 * Job de agradecimento pós-pagamento.
 *
 * Enfileirado via listener quando o evento payment.created é emitido.
 * Verifica se há uma collection_rule ON_PAYMENT ativa para a filial,
 * busca o template de e-mail e registra o dispatch na fila de envio.
 *
 * O envio real do e-mail é responsabilidade do serviço de mail (fora do escopo deste job).
 */
@Injectable()
export class PaymentThanksProcessor implements OnModuleInit {
  private readonly logger = new Logger(PaymentThanksProcessor.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly drizzleService: DrizzleService,
  ) {}

  onModuleInit(): void {
    this.queueService.registerProcessor(
      'financial.payment-thanks',
      async (payload) => {
        const schema = resolveTenantSchema(payload);
        const entryId = String(payload.entryId ?? '');
        const branchId = String(payload.branchId ?? '');

        if (!entryId || !branchId) {
          this.logger.warn('payment-thanks: payload inválido', payload);
          return;
        }

        // Busca a collection_rule ON_PAYMENT ativa para a filial
        const ruleResult = await this.drizzleService.getClient().execute(
          sql.raw(`
          SELECT r.id AS rule_id, r.email_template_id, t.subject, t.body_text
          FROM ${quoteIdent(schema.replace(/"/g, ''))}.collection_rules r
          LEFT JOIN ${quoteIdent(schema.replace(/"/g, ''))}.email_templates t
            ON t.id = r.email_template_id AND t.deleted_at IS NULL
          WHERE r.branch_id = ${quoteLiteral(branchId)}::uuid
            AND r.trigger_event = 'ON_PAYMENT'
            AND r.active = true
          LIMIT 1
        `),
        );

        if (!ruleResult.rows.length) {
          this.logger.debug(
            `payment-thanks: nenhuma regra ON_PAYMENT ativa para branchId=${branchId}`,
          );
          return;
        }

        const rule = ruleResult.rows[0] as Record<string, unknown>;

        // Registra o dispatch como agendado para envio imediato
        await this.drizzleService.getClient().execute(
          sql.raw(`
          INSERT INTO ${quoteIdent(schema.replace(/"/g, ''))}.collection_dispatches (
            rule_id,
            entry_id,
            branch_id,
            email_template_id,
            channel,
            dispatch_date,
            status,
            scheduled_for
          ) VALUES (
            ${quoteLiteral(String(rule.rule_id))}::uuid,
            ${quoteLiteral(entryId)}::uuid,
            ${quoteLiteral(branchId)}::uuid,
            ${rule.email_template_id ? `${quoteLiteral(String(rule.email_template_id))}::uuid` : 'NULL'},
            'EMAIL',
            CURRENT_DATE,
            'SCHEDULED',
            NOW()
          )
          ON CONFLICT DO NOTHING
        `),
        );

        this.logger.log(
          `payment-thanks: dispatch agendado para entry=${entryId} branch=${branchId}`,
        );
      },
    );
  }
}
