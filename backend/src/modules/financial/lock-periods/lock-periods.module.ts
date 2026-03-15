import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { LockPeriodsRepository } from './lock-periods.repository';
import { LockPeriodsService } from './lock-periods.service';

@Module({
  imports: [DatabaseModule],
  providers: [LockPeriodsRepository, LockPeriodsService],
  exports: [LockPeriodsService],
})
export class LockPeriodsModule {}
