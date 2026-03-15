import { Module } from '@nestjs/common';
import { CacheModule } from '../../../infrastructure/cache/cache.module';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

@Module({
  imports: [DatabaseModule, CacheModule],
  providers: [ReportsRepository, ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
