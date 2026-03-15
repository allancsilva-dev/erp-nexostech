export interface BankAccount {
  id: string;
  name: string;
  bankCode: string;
  agency: string;
  accountNumber: string;
  type: 'CHECKING' | 'SAVINGS' | 'INVESTMENT';
  balance: string;
  active: boolean;
  createdAt: string;
}

export interface LockPeriod {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

export interface FinancialSettings {
  defaultPaymentMethod: string | null;
  lateFeePercentage: string;
  interestRatePercentage: string;
  defaultDueDays: number;
  boletoInstructions: string | null;
}

export interface DocumentSequence {
  prefix: string;
  nextNumber: number;
  padLength: number;
}
