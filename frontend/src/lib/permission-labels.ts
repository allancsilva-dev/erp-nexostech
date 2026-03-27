export const PERMISSION_LABELS: Record<string, string> = {
  'financial.dashboard.view': 'Visualizar dashboard',
  'financial.entries.view': 'Visualizar lançamentos',
  'financial.entries.create': 'Criar lançamentos',
  'financial.entries.edit': 'Editar lançamentos',
  'financial.entries.delete': 'Excluir lançamentos',
  'financial.entries.approve': 'Aprovar lançamentos',

  'financial.categories.view': 'Visualizar categorias',
  'financial.categories.manage': 'Gerenciar categorias',

  'financial.reconciliation.execute': 'Executar conciliação',

  'financial.reports.view': 'Visualizar relatórios',
  'financial.reports.export': 'Exportar relatórios',

  'financial.settings.manage': 'Gerenciar configurações',
  'financial.bank_accounts.manage': 'Gerenciar contas bancárias',

  'admin.users.manage': 'Gerenciar usuários',
  'admin.branches.manage': 'Gerenciar filiais',
};

export function getPermissionLabel(code: string): string {
  return PERMISSION_LABELS[code] || code;
}

export function groupPermissions(permissions: string[]) {
  const groups: Record<string, string[]> = {};

  permissions.forEach((perm) => {
    const [module] = perm.split('.');
    if (!groups[module]) groups[module] = [];
    groups[module].push(perm);
  });

  return groups;
}
