import { Module } from '@nestjs/common';
import { EntriesController } from './controllers/entries.controller';
import { HealthController } from './controllers/health.controller';
import { FinancialModule } from '../../modules/financial/financial.module';

@Module({
  imports: [FinancialModule],
  controllers: [HealthController, EntriesController],
})
export class V1Module {}
