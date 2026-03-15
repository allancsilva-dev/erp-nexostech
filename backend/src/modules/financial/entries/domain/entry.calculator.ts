import Decimal from 'decimal.js';

export class EntryCalculator {
  calculateInstallments(totalAmount: string, count: number): string[] {
    const total = new Decimal(totalAmount);
    const baseValue = total
      .dividedBy(count)
      .toDecimalPlaces(2, Decimal.ROUND_DOWN);

    const installments = Array.from({ length: count }, () =>
      baseValue.toFixed(2),
    );
    const remainder = total.minus(baseValue.times(count));
    installments[count - 1] = baseValue.plus(remainder).toFixed(2);
    return installments;
  }

  calculateRemainingBalance(
    entryAmount: string,
    payments: { amount: string }[],
  ): string {
    const total = new Decimal(entryAmount);
    const paid = payments.reduce(
      (acc, payment) => acc.plus(new Decimal(payment.amount)),
      new Decimal(0),
    );
    return total.minus(paid).toFixed(2);
  }
}
