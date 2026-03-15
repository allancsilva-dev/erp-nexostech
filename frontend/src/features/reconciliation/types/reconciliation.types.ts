export interface ReconciliationItem {
  id: string;
  description: string;
  amount: string;
  date: string;
}

export interface ReconciliationMatch {
  statementId: string;
  entryId: string;
}
