import { Module } from '@nestjs/common';
import { CacheModule } from '../../../infrastructure/cache/cache.module';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [DatabaseModule, CacheModule],
  providers: [DashboardRepository, DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
