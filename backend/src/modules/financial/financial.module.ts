import { Module } from '@nestjs/common';
import { EntriesModule } from './entries/entries.module';
import { CategoriesModule } from './categories/categories.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { AuditModule } from './audit/audit.module';
import { PaymentsModule } from './payments/payments.module';
import { TransfersModule } from './transfers/transfers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { BoletosModule } from './boletos/boletos.module';
import { CollectionRulesModule } from './collection-rules/collection-rules.module';
import { SettingsModule } from './settings/settings.module';
import { LockPeriodsModule } from './lock-periods/lock-periods.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { ApprovalRulesModule } from './approval-rules/approval-rules.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    EntriesModule,
    CategoriesModule,
    BankAccountsModule,
    AuditModule,
    PaymentsModule,
    TransfersModule,
    DashboardModule,
    ReportsModule,
    BoletosModule,
    CollectionRulesModule,
    SettingsModule,
    LockPeriodsModule,
    ApprovalsModule,
    ApprovalRulesModule,
    JobsModule,
  ],
  exports: [
    EntriesModule,
    CategoriesModule,
    BankAccountsModule,
    AuditModule,
    PaymentsModule,
    TransfersModule,
    DashboardModule,
    ReportsModule,
    BoletosModule,
    CollectionRulesModule,
    SettingsModule,
    LockPeriodsModule,
    ApprovalsModule,
    ApprovalRulesModule,
  ],
})
export class FinancialModule {}
