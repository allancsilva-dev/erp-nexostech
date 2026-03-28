export const ENTRY_TYPE_LABELS = {
  PAYABLE: 'Despesa',
  RECEIVABLE: 'Receita',
} as const;

export const PAYMENT_METHOD_LABELS = {
  BOLETO: 'Boleto',
  PIX: 'Pix',
  TRANSFER: 'Transferência',
  CARD: 'Cartão',
  CASH: 'Dinheiro',
  OTHER: 'Outro',
} as const;

export const ENTRY_TYPE_EMPTY_STATE = {
  PAYABLE: { title: 'Nenhuma conta a pagar', description: 'Crie o primeiro lançamento para começar' },
  RECEIVABLE: { title: 'Nenhuma conta a receber', description: 'Crie o primeiro lançamento para começar' },
} as const;

export const ENTRY_TYPE_PAGE_TITLE = {
  PAYABLE: 'Contas a pagar',
  RECEIVABLE: 'Contas a receber',
} as const;

export default ENTRY_TYPE_LABELS;
