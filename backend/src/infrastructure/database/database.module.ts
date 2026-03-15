import { Module } from '@nestjs/common';
import { DrizzleService } from './drizzle.service';
import { TenantContextService } from './tenant-context.service';
import { TransactionHelper } from './transaction.helper';

@Module({
  providers: [TenantContextService, DrizzleService, TransactionHelper],
  exports: [TenantContextService, DrizzleService, TransactionHelper],
})
export class DatabaseModule {}
