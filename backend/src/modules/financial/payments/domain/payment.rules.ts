import Decimal from 'decimal.js';
import { BusinessException } from '../../../../common/exceptions/business.exception';

export class PaymentRules {
  validatePaymentAmount(remainingBalance: string, amountToPay: string): void {
    const remaining = new Decimal(remainingBalance);
    const amount = new Decimal(amountToPay);

    if (amount.lte(0)) {
      throw new BusinessException('VALIDATION_AMOUNT', 400, {
        field: 'amount',
      });
    }

    if (amount.gt(remaining)) {
      throw new BusinessException('PAYMENT_AMOUNT_EXCEEDS', undefined, {
        remainingBalance,
        amountToPay,
      });
    }
  }

  validateRefundPeriod(lastPaymentDate: string, maxRefundDays: number): void {
    const now = new Date();
    const paymentDate = new Date(lastPaymentDate);
    const elapsedDays = Math.floor(
      (now.getTime() - paymentDate.getTime()) / 86_400_000,
    );

    if (elapsedDays > maxRefundDays) {
      throw new BusinessException('PAYMENT_REFUND_PERIOD_EXPIRED', undefined, {
        lastPaymentDate,
        maxRefundDays,
        elapsedDays,
      });
    }
  }
}
