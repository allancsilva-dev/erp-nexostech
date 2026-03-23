import { Module } from '@nestjs/common';
import { BranchesModule } from '../../modules/branches/branches.module';
import { ContactsModule } from '../../modules/contacts/contacts.module';
import { EntriesController } from './controllers/entries.controller';
import { BranchesController } from './controllers/branches.controller';
import { CategoriesController } from './controllers/categories.controller';
import { ContactsController } from './controllers/contacts.controller';
import { HealthController } from './controllers/health.controller';
import { RolesController } from './controllers/roles.controller';
import { PermissionsController } from './controllers/permissions.controller';
import { BankAccountsController } from './controllers/bank-accounts.controller';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { PaymentsController } from './controllers/payments.controller';
import { TransfersController } from './controllers/transfers.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { ReportsController } from './controllers/reports.controller';
import { BoletosController } from './controllers/boletos.controller';
import { CollectionRulesController } from './controllers/collection-rules.controller';
import { SettingsController } from './controllers/settings.controller';
import { LockPeriodsController } from './controllers/lock-periods.controller';
import { ApprovalsController } from './controllers/approvals.controller';
import { ApprovalRulesController } from './controllers/approval-rules.controller';
import { ReconciliationController } from './controllers/reconciliation.controller';
import { UsersController } from './controllers/users.controller';
import { MetricsController } from './controllers/metrics.controller';
import { TenantsController } from './controllers/tenants.controller';
import { AuthController } from './controllers/auth.controller';
import { AttachmentsController } from './controllers/attachments.controller';
import { FinancialModule } from '../../modules/financial/financial.module';
import { RbacModule } from '../../modules/rbac/rbac.module';
import { TenantsModule } from '../../modules/tenants/tenants.module';
import { BranchGuard } from '../../common/guards/branch.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { MetricsService } from '../../infrastructure/observability/metrics.service';

@Module({
  imports: [
    FinancialModule,
    BranchesModule,
    RbacModule,
    ContactsModule,
    DatabaseModule,
    CacheModule,
    TenantsModule,
  ],
  controllers: [
    HealthController,
    EntriesController,
    BranchesController,
    RolesController,
    PermissionsController,
    ContactsController,
    CategoriesController,
    BankAccountsController,
    AuditLogsController,
    PaymentsController,
    TransfersController,
    DashboardController,
    ReportsController,
    BoletosController,
    CollectionRulesController,
    SettingsController,
    LockPeriodsController,
    ApprovalsController,
    ApprovalRulesController,
    ReconciliationController,
    UsersController,
    MetricsController,
    TenantsController,
    AuthController,
    AttachmentsController,
  ],
  providers: [BranchGuard, RbacGuard, FeatureFlagGuard, MetricsService],
})
export class V1Module {}
