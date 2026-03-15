import { Module } from '@nestjs/common';
import { EntriesModule } from './entries/entries.module';
import { CategoriesModule } from './categories/categories.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [EntriesModule, CategoriesModule, BankAccountsModule, AuditModule],
  exports: [EntriesModule, CategoriesModule, BankAccountsModule, AuditModule],
})
export class FinancialModule {}
