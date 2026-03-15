import { Module } from '@nestjs/common';
import { BranchesModule } from '../../modules/branches/branches.module';
import { ContactsModule } from '../../modules/contacts/contacts.module';
import { EntriesController } from './controllers/entries.controller';
import { BranchesController } from './controllers/branches.controller';
import { CategoriesController } from './controllers/categories.controller';
import { ContactsController } from './controllers/contacts.controller';
import { HealthController } from './controllers/health.controller';
import { RolesController } from './controllers/roles.controller';
import { BankAccountsController } from './controllers/bank-accounts.controller';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { FinancialModule } from '../../modules/financial/financial.module';
import { RbacModule } from '../../modules/rbac/rbac.module';
import { BranchGuard } from '../../common/guards/branch.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';

@Module({
  imports: [FinancialModule, BranchesModule, RbacModule, ContactsModule],
  controllers: [
    HealthController,
    EntriesController,
    BranchesController,
    RolesController,
    ContactsController,
    CategoriesController,
    BankAccountsController,
    AuditLogsController,
  ],
  providers: [BranchGuard, RbacGuard],
})
export class V1Module {}
