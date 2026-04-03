import { BusinessException } from '../../../../common/exceptions/business.exception';
import Decimal from 'decimal.js';

export type ReconciliationItem = {
  id: string;
  reconciled: boolean;
  amount: string;
};

export type EntryForReconciliation = {
  id: string;
  status: string;
  amount: string;
};

export class MatchRules {
  /**
   * Garante que o item do extrato ainda não foi conciliado.
   */
  assertItemNotReconciled(item: ReconciliationItem): void {
    if (item.reconciled) {
      throw new BusinessException(
        'RECONCILIATION_ITEM_ALREADY_MATCHED',
        undefined,
        { itemId: item.id },
      );
    }
  }

  /**
   * Garante que a entry não está em status que impede conciliação.
   * Entries canceladas ou em rascunho não podem ser conciliadas.
   */
  assertEntryEligible(entry: EntryForReconciliation): void {
    const ineligibleStatuses = ['CANCELLED', 'DRAFT'];
    if (ineligibleStatuses.includes(entry.status)) {
      throw new BusinessException(
        'ENTRY_NOT_ELIGIBLE_FOR_RECONCILIATION',
        undefined,
        { entryId: entry.id, status: entry.status },
      );
    }
  }

  /**
   * Valida que a divergência de valor entre o item do extrato e a entry
   * está dentro do limite aceitável (configurable, padrão R$ 0,01 centavo).
   */
  assertAmountWithinTolerance(
    itemAmount: string,
    entryAmount: string,
    toleranceCents = 0.01,
  ): void {
    const item = new Decimal(itemAmount).abs();
    const entry = new Decimal(entryAmount).abs();
    const diff = item.minus(entry).abs();

    if (diff.greaterThan(new Decimal(toleranceCents))) {
      throw new BusinessException(
        'RECONCILIATION_AMOUNT_DIVERGENCE',
        undefined,
        {
          itemAmount,
          entryAmount,
          difference: diff.toFixed(2),
          toleranceCents,
        },
      );
    }
  }
}
