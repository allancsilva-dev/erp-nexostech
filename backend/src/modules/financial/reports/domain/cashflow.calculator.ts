import Decimal from 'decimal.js';

type CashflowRow = { inflow: string; outflow: string };

export class CashflowCalculator {
  calculateAccumulated(startBalance: string, rows: CashflowRow[]): string[] {
    let balance = new Decimal(startBalance);
    return rows.map((row) => {
      balance = balance.plus(new Decimal(row.inflow)).minus(new Decimal(row.outflow));
      return balance.toFixed(2);
    });
  }
}
