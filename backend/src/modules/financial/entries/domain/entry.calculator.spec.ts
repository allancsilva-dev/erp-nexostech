import { EntryCalculator } from './entry.calculator';

describe('EntryCalculator', () => {
  it('splits installments with rounding residue on last parcel (1000/3)', () => {
    const calculator = new EntryCalculator();

    const installments = calculator.calculateInstallments('1000.00', 3);

    expect(installments).toEqual(['333.33', '333.33', '333.34']);
    expect(
      installments.reduce((acc, value) => acc + Number(value), 0),
    ).toBeCloseTo(1000, 2);
  });

  it('calculates remaining balance using decimal-safe sum', () => {
    const calculator = new EntryCalculator();

    const remaining = calculator.calculateRemainingBalance('1000.00', [
      { amount: '333.33' },
      { amount: '333.33' },
      { amount: '333.34' },
    ]);

    expect(remaining).toBe('0.00');
  });
});
