import { Module } from '@nestjs/common';
import { EntriesModule } from './entries/entries.module';

@Module({
  imports: [EntriesModule],
  exports: [EntriesModule],
})
export class FinancialModule {}
