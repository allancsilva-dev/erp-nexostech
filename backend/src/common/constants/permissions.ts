export interface PermissionDef {
  code: string;
  module: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: PermissionDef[] = [
  // PADRÃO:
  // description deve seguir:
  // "Verbo no infinitivo + objeto"
  // Ex: "Criar lançamentos"

  {
    code: 'financial.dashboard.view',
    module: 'financial',
    description: 'Visualizar dashboard financeiro',
  },
  {
    code: 'financial.entries.view',
    module: 'financial',
    description: 'Visualizar lançamentos',
  },
  {
    code: 'financial.entries.create',
    module: 'financial',
    description: 'Criar lançamentos',
  },
  {
    code: 'financial.entries.edit',
    module: 'financial',
    description: 'Editar lançamentos',
  },
  {
    code: 'financial.entries.pay',
    module: 'financial',
    description: 'Registrar pagamento',
  },
  {
    code: 'financial.entries.cancel',
    module: 'financial',
    description: 'Cancelar lançamentos',
  },
  {
    code: 'financial.entries.delete',
    module: 'financial',
    description: 'Excluir lançamentos',
  },
  {
    code: 'financial.entries.restore',
    module: 'financial',
    description: 'Restaurar lançamentos excluídos',
  },
  {
    code: 'financial.entries.approve',
    module: 'financial',
    description: 'Aprovar lançamentos',
  },
  {
    code: 'financial.categories.view',
    module: 'financial',
    description: 'Visualizar categorias',
  },
  {
    code: 'financial.categories.manage',
    module: 'financial',
    description: 'Gerenciar categorias',
  },
  {
    code: 'financial.reconciliation.execute',
    module: 'financial',
    description: 'Executar conciliação',
  },
  {
    code: 'financial.reports.view',
    module: 'financial',
    description: 'Visualizar relatórios',
  },
  {
    code: 'financial.reports.export',
    module: 'financial',
    description: 'Exportar relatórios',
  },
  {
    code: 'financial.settings.manage',
    module: 'financial',
    description: 'Gerenciar configurações financeiras',
  },
  {
    code: 'financial.audit.view',
    module: 'financial',
    description: 'Visualizar auditoria',
  },
  {
    code: 'financial.bank_accounts.manage',
    module: 'financial',
    description: 'Gerenciar contas bancárias',
  },
  {
    code: 'financial.transfers.manage',
    module: 'financial',
    description: 'Criar e gerenciar transferências entre contas',
  },
  {
    code: 'financial.approval_rules.manage',
    module: 'financial',
    description: 'Gerenciar regras de aprovação',
  },
  {
    code: 'admin.branches.manage',
    module: 'admin',
    description: 'Gerenciar filiais',
  },
  {
    code: 'admin.users.manage',
    module: 'admin',
    description: 'Gerenciar usuários e permissões',
  },
  {
    code: 'contacts.view',
    module: 'contacts',
    description: 'Visualizar contatos',
  },
  {
    code: 'contacts.manage',
    module: 'contacts',
    description: 'Gerenciar contatos',
  },
];
