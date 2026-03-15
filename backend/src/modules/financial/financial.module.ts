import { Module } from '@nestjs/common';
import { EntriesModule } from './entries/entries.module';
import { CategoriesModule } from './categories/categories.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { AuditModule } from './audit/audit.module';
import { PaymentsModule } from './payments/payments.module';
import { TransfersModule } from './transfers/transfers.module';

@Module({
  imports: [
    EntriesModule,
    CategoriesModule,
    BankAccountsModule,
    AuditModule,
    PaymentsModule,
    TransfersModule,
  ],
  exports: [
    EntriesModule,
    CategoriesModule,
    BankAccountsModule,
    AuditModule,
    PaymentsModule,
    TransfersModule,
  ],
})
export class FinancialModule {}
