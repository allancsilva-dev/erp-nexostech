import Decimal from 'decimal.js';
import { BusinessException } from '../../../../common/exceptions/business.exception';

export class PaymentRules {
  validatePaymentAmount(remainingBalance: string, amountToPay: string): void {
    const remaining = new Decimal(remainingBalance);
    const amount = new Decimal(amountToPay);

    if (amount.lte(0)) {
      throw new BusinessException('VALIDATION_ERROR', 'Valor de pagamento deve ser positivo', undefined, 400);
    }

    if (amount.gt(remaining)) {
      throw new BusinessException('AMOUNT_EXCEEDS_REMAINING', 'Valor excede saldo restante');
    }
  }

  validateRefundPeriod(lastPaymentDate: string, maxRefundDays: number): void {
    const now = new Date();
    const paymentDate = new Date(lastPaymentDate);
    const elapsedDays = Math.floor((now.getTime() - paymentDate.getTime()) / 86_400_000);

    if (elapsedDays > maxRefundDays) {
      throw new BusinessException('REFUND_PERIOD_EXPIRED', 'Prazo de estorno expirado');
    }
  }
}
