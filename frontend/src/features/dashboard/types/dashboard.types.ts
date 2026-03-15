export interface DashboardSummary {
  currentBalance: string;
  totalReceivable30d: string;
  totalPayable30d: string;
  monthResult: string;
  overdueReceivable: string;
  overduePayable: string;
}

export interface CashflowPoint {
  label: string;
  incoming: string;
  outgoing: string;
}

export interface ExpenseBreakdownItem {
  categoryId: string;
  category: string;
  value: string;
  color: string;
  percentage: number;
}

export interface OverdueItem {
  id: string;
  documentNumber: string;
  description: string;
  contactName: string | null;
  dueDate: string;
  amount: string;
  daysOverdue: number;
}
