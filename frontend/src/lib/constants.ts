import type { EntryStatus } from '@/features/entries/types/entry.types';

export const STATUS_CONFIG: Record<EntryStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-slate-100 text-slate-600' },
  PENDING_APPROVAL: { label: 'Aguard. Aprovacao', color: 'bg-amber-50 text-amber-700' },
  PENDING: { label: 'Pendente', color: 'bg-blue-50 text-blue-700' },
  PARTIAL: { label: 'Parcial', color: 'bg-purple-50 text-purple-700' },
  PAID: { label: 'Pago', color: 'bg-emerald-50 text-emerald-700' },
  OVERDUE: { label: 'Vencido', color: 'bg-red-50 text-red-700' },
  CANCELLED: { label: 'Cancelado', color: 'bg-slate-100 text-slate-500 line-through' },
};

export const ROUTES = {
  dashboard: '/dashboard',
  contasPagar: '/financeiro/contas-pagar',
  contasReceber: '/financeiro/contas-receber',
  fluxoCaixa: '/financeiro/fluxo-caixa',
  categorias: '/financeiro/categorias',
  conciliacao: '/financeiro/conciliacao',
  relatorios: '/financeiro/relatorios',
  transferencias: '/financeiro/transferencias',
  boletos: '/financeiro/boletos',
  aprovacoes: '/financeiro/aprovacoes',
  auditoria: '/financeiro/auditoria',
  configuracoes: '/financeiro/configuracoes',
  reguaCobranca: '/financeiro/regua-cobranca',
  adminFiliais: '/admin/filiais',
  adminUsuarios: '/admin/usuarios',
};
