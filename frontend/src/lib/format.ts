import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Decimal from 'decimal.js';

export function formatCurrency(value: string): string {
  const num = new Decimal(value || '0');
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num.toNumber());
}

export function formatDate(isoDate: string): string {
  return format(parseISO(isoDate), 'dd/MM/yyyy', { locale: ptBR });
}

export function formatDateTime(isoDate: string): string {
  return format(parseISO(isoDate), 'dd/MM/yyyy HH:mm', { locale: ptBR });
}
