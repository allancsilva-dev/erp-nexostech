import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { TenantsRepository } from './tenants.repository';
import { TenantsService } from './tenants.service';

@Module({
  imports: [DatabaseModule, CacheModule],
  providers: [TenantsRepository, TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
