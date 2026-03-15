import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { ReconciliationRepository } from './reconciliation.repository';
import { ReconciliationService } from './reconciliation.service';

@Module({
  imports: [DatabaseModule],
  providers: [ReconciliationRepository, ReconciliationService],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
