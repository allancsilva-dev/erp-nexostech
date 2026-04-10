import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { quoteLiteral } from '../../infrastructure/database/sql-builder.util';

const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: 'RECEIVABLE' | 'PAYABLE';
}> = [
  { name: 'Vendas de Produtos', type: 'RECEIVABLE' },
  { name: 'Vendas de Serviços', type: 'RECEIVABLE' },
  { name: 'Outras Receitas', type: 'RECEIVABLE' },
  { name: 'Aluguel', type: 'PAYABLE' },
  { name: 'Folha de Pagamento', type: 'PAYABLE' },
  { name: 'Impostos e Tributos', type: 'PAYABLE' },
  { name: 'Marketing', type: 'PAYABLE' },
  { name: 'Fornecedores', type: 'PAYABLE' },
  { name: 'Utilities (Energia, Água, Internet)', type: 'PAYABLE' },
  { name: 'Outras Despesas', type: 'PAYABLE' },
];

const DEFAULT_COLLECTION_RULES: Array<{
  name: string;
  trigger: string;
  offsetDays: number;
  channel: string;
}> = [
  {
    name: 'Aviso 7 dias antes',
    trigger: 'BEFORE_DUE',
    offsetDays: -7,
    channel: 'EMAIL',
  },
  {
    name: 'Aviso 1 dia antes',
    trigger: 'BEFORE_DUE',
    offsetDays: -1,
    channel: 'EMAIL',
  },
  { name: 'No vencimento', trigger: 'ON_DUE', offsetDays: 0, channel: 'EMAIL' },
  {
    name: 'Atraso 3 dias',
    trigger: 'AFTER_DUE',
    offsetDays: 3,
    channel: 'EMAIL',
  },
  {
    name: 'Atraso 10 dias',
    trigger: 'AFTER_DUE',
    offsetDays: 10,
    channel: 'EMAIL',
  },
  {
    name: 'Confirmação de pagamento',
    trigger: 'ON_PAYMENT',
    offsetDays: 0,
    channel: 'EMAIL',
  },
];

export interface OnboardBranchParams {
  branchId: string;
  adminUserId: string;
  schema: string;
}

type TxHandle = {
  execute: (query: ReturnType<typeof sql.raw>) => Promise<unknown>;
};

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  async onboardBranch(tx: TxHandle, params: OnboardBranchParams): Promise<void> {
    const { branchId, adminUserId, schema } = params;
    const branchLiteral = `${quoteLiteral(branchId)}::uuid`;

    await tx.execute(
      sql.raw(`
        INSERT INTO ${schema}.user_branches (user_id, branch_id)
        VALUES (${quoteLiteral(adminUserId)}, ${branchLiteral})
        ON CONFLICT (user_id, branch_id) DO NOTHING
      `),
    );

    await tx.execute(
      sql.raw(`
        INSERT INTO ${schema}.financial_settings (
          branch_id, closing_day, currency, alert_days_before,
          email_alerts, max_refund_days_payable, max_refund_days_receivable
        ) VALUES (
          ${branchLiteral}, 1, 'BRL', 3, true, 90, 180
        )
        ON CONFLICT (branch_id) DO NOTHING
      `),
    );

    const currentYear = new Date().getFullYear();
    for (const type of ['PAY', 'REC']) {
      await tx.execute(
        sql.raw(`
          INSERT INTO ${schema}.document_sequences (branch_id, type, year, last_sequence)
          VALUES (${branchLiteral}, ${quoteLiteral(type)}, ${currentYear}, 0)
          ON CONFLICT (branch_id, type, year) DO NOTHING
        `),
      );
    }

    for (const category of DEFAULT_CATEGORIES) {
      await tx.execute(
        sql.raw(`
          INSERT INTO ${schema}.categories (branch_id, name, type, active)
          VALUES (${branchLiteral}, ${quoteLiteral(category.name)}, ${quoteLiteral(category.type)}, true)
        `),
      );
    }

    for (const rule of DEFAULT_COLLECTION_RULES) {
      await tx.execute(
        sql.raw(`
          INSERT INTO ${schema}.collection_rules (
            branch_id, name, trigger_event, offset_days, channel, active
          ) VALUES (
            ${branchLiteral},
            ${quoteLiteral(rule.name)},
            ${quoteLiteral(rule.trigger)},
            ${rule.offsetDays},
            ${quoteLiteral(rule.channel)},
            true
          )
        `),
      );
    }

    this.logger.log(`Onboarding da filial ${branchId} concluído`);
  }
}