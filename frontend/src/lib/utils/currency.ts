export function formatCurrency(value: string | number | null | undefined): string {
  if (value == null) {
    return 'R$ 0,00';
  }

  const amount = typeof value === 'string' ? Number.parseFloat(value) || 0 : value;

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}
