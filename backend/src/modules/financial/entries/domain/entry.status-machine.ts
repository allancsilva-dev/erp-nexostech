import { BusinessException } from '../../../../common/exceptions/business.exception';

type EntryStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'PENDING'
  | 'PARTIAL'
  | 'OVERDUE'
  | 'PAID'
  | 'CANCELLED';

export class EntryStatusMachine {
  private static readonly transitions: Record<EntryStatus, EntryStatus[]> = {
    DRAFT: ['PENDING_APPROVAL', 'PENDING', 'CANCELLED'],
    PENDING_APPROVAL: ['PENDING', 'CANCELLED'],
    PENDING: ['OVERDUE', 'PAID', 'PARTIAL', 'CANCELLED'],
    PARTIAL: ['PAID', 'PARTIAL', 'PENDING'],
    OVERDUE: ['PAID', 'PARTIAL', 'CANCELLED'],
    PAID: ['PENDING', 'PARTIAL'],
    CANCELLED: [],
  };

  static canTransition(from: EntryStatus, to: EntryStatus): boolean {
    return this.transitions[from].includes(to);
  }

  static assertTransition(from: EntryStatus, to: EntryStatus): void {
    if (!this.canTransition(from, to)) {
      throw new BusinessException(
        'INVALID_STATUS_TRANSITION',
        `Nao e possivel mudar de ${from} para ${to}`,
        { currentStatus: from, targetStatus: to },
      );
    }
  }
}
