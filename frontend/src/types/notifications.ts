export type NotificationType =
  | 'ENTRY_DUE_SOON'
  | 'ENTRY_OVERDUE'
  | 'APPROVAL_PENDING'
  | 'APPROVAL_DONE'
  | 'APPROVAL_REJECTED'
  | 'PAYMENT_RECEIVED'
  | 'ENTRY_CANCELLED';

export interface NotificationMetadata {
  entry_id?: string;
  document_number?: string;
  amount?: string;            // sempre string — decimal.js
  type?: 'PAYABLE' | 'RECEIVABLE';
  contact_name?: string;
  reason?: string;            // para APPROVAL_REJECTED
  days_until_due?: number;    // para ENTRY_DUE_SOON
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: NotificationMetadata | null;
  read_at: string | null;    // null = não lida
  deleted_at: string | null; // null = ativa
  created_at: string;
}

export interface NotificationsResponse {
  data: Notification[];
  total: number;
  unread_count: number;
}

export interface NotificationCountResponse {
  unread_count: number;
}
