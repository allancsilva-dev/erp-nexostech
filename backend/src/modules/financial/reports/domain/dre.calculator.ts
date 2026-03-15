import Decimal from 'decimal.js';

export class DreCalculator {
  calculateResult(revenueTotal: string, expenseTotal: string): string {
    return new Decimal(revenueTotal).minus(new Decimal(expenseTotal)).toFixed(2);
  }
}
