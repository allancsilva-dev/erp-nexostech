import { PaymentCalculator } from './payment.calculator';

describe('PaymentCalculator', () => {
  it('returns PAID when decimal installments fully settle the entry (1000/3)', () => {
    const calculator = new PaymentCalculator();

    const remaining = calculator.calculateRemainingBalance('1000.00', ['333.33', '333.33', '333.34']);
    const status = calculator.determineStatus('1000.00', ['333.33', '333.33', '333.34']);

    expect(remaining).toBe('0.00');
    expect(status).toBe('PAID');
  });

  it('returns PARTIAL when rounding leaves a positive balance', () => {
    const calculator = new PaymentCalculator();

    const remaining = calculator.calculateRemainingBalance('10.00', ['3.33', '3.33', '3.33']);
    const status = calculator.determineStatus('10.00', ['3.33', '3.33', '3.33']);

    expect(remaining).toBe('0.01');
    expect(status).toBe('PARTIAL');
  });
});
