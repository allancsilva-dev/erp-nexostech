export interface PermissionDef {
  code: string;
  module: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: PermissionDef[] = [
  {
    code: 'financial.dashboard.view',
    module: 'financial',
    description: 'Ver dashboard financeiro',
  },
  {
    code: 'financial.entries.view',
    module: 'financial',
    description: 'Listar lancamentos',
  },
  {
    code: 'financial.entries.create',
    module: 'financial',
    description: 'Criar lancamentos',
  },
  {
    code: 'financial.entries.edit',
    module: 'financial',
    description: 'Editar lancamentos',
  },
  {
    code: 'financial.entries.pay',
    module: 'financial',
    description: 'Registrar pagamento',
  },
  {
    code: 'financial.entries.cancel',
    module: 'financial',
    description: 'Cancelar lancamentos',
  },
  {
    code: 'financial.entries.delete',
    module: 'financial',
    description: 'Excluir lancamentos',
  },
  {
    code: 'financial.entries.approve',
    module: 'financial',
    description: 'Aprovar lancamentos',
  },
  {
    code: 'financial.categories.view',
    module: 'financial',
    description: 'Ver categorias',
  },
  {
    code: 'financial.categories.manage',
    module: 'financial',
    description: 'Gerenciar categorias',
  },
  {
    code: 'financial.reconciliation.execute',
    module: 'financial',
    description: 'Executar conciliacao',
  },
  {
    code: 'financial.reports.view',
    module: 'financial',
    description: 'Ver relatorios',
  },
  {
    code: 'financial.reports.export',
    module: 'financial',
    description: 'Exportar relatorios',
  },
  {
    code: 'financial.settings.manage',
    module: 'financial',
    description: 'Gerenciar configuracoes financeiras',
  },
  {
    code: 'financial.audit.view',
    module: 'financial',
    description: 'Ver auditoria',
  },
  {
    code: 'financial.bank_accounts.manage',
    module: 'financial',
    description: 'Gerenciar contas bancarias',
  },
  {
    code: 'financial.approval_rules.manage',
    module: 'financial',
    description: 'Gerenciar regras de aprovacao',
  },
  {
    code: 'admin.branches.manage',
    module: 'admin',
    description: 'Gerenciar filiais',
  },
  {
    code: 'admin.users.manage',
    module: 'admin',
    description: 'Gerenciar usuarios e roles',
  },
];
