// Tradução dos valores de ação do backend para PT-BR legível
export const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Criação',
  UPDATE: 'Edição',
  DELETE: 'Exclusão',
  CANCEL: 'Cancelamento',
  RESTORE: 'Restauração',
  PAY: 'Pagamento',
  REFUND: 'Estorno',
  APPROVE: 'Aprovação',
  REJECT: 'Reprovação',
  RECONCILE: 'Conciliação',
  EXPORT: 'Exportação',
};

// Tradução dos nomes de entidade do backend para PT-BR legível
export const ENTITY_LABELS: Record<string, string> = {
  // valores reais gravados pelo backend
  entries: 'Lançamento Financeiro',
  approvals: 'Aprovação',
  'approval-rules': 'Regra de Aprovação',
  'bank-accounts': 'Conta Bancária',
  branches: 'Filial',
  contacts: 'Contato',
  tenants: 'Empresa',
  // aliases snake_case mantidos para compatibilidade futura
  financial_entries: 'Lançamento Financeiro',
  payments: 'Pagamento',
  bank_accounts: 'Conta Bancária',
  categories: 'Categoria',
  roles: 'Perfil de Acesso',
  users: 'Usuário',
  transfers: 'Transferência',
  settings: 'Configurações',
  reconciliation: 'Conciliação Bancária',
  collection_rules: 'Regra de Cobrança',
  approval_rules: 'Regra de Aprovação',
  document_sequences: 'Sequência de Documento',
  financial_lock_periods: 'Período Contábil',
};
