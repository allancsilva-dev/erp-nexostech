import { Module } from '@nestjs/common';
import { BranchesModule } from '../../modules/branches/branches.module';
import { EntriesController } from './controllers/entries.controller';
import { BranchesController } from './controllers/branches.controller';
import { HealthController } from './controllers/health.controller';
import { RolesController } from './controllers/roles.controller';
import { FinancialModule } from '../../modules/financial/financial.module';
import { RbacModule } from '../../modules/rbac/rbac.module';
import { BranchGuard } from '../../common/guards/branch.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';

@Module({
  imports: [FinancialModule, BranchesModule, RbacModule],
  controllers: [
    HealthController,
    EntriesController,
    BranchesController,
    RolesController,
  ],
  providers: [BranchGuard, RbacGuard],
})
export class V1Module {}
