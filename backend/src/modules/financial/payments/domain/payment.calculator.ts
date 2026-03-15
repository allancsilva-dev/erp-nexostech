import Decimal from 'decimal.js';

export class PaymentCalculator {
  calculateRemainingBalance(entryAmount: string, paymentAmounts: string[]): string {
    const total = new Decimal(entryAmount);
    const paid = paymentAmounts.reduce((acc, current) => acc.plus(new Decimal(current)), new Decimal(0));
    return total.minus(paid).toFixed(2);
  }

  determineStatus(entryAmount: string, paymentAmounts: string[]): 'PENDING' | 'PARTIAL' | 'PAID' {
    const remaining = new Decimal(this.calculateRemainingBalance(entryAmount, paymentAmounts));
    if (remaining.lte(0)) return 'PAID';

    const paid = new Decimal(entryAmount).minus(remaining);
    if (paid.gt(0)) return 'PARTIAL';

    return 'PENDING';
  }
}
