import { Module } from '@nestjs/common';
import { QueueModule } from '../../../infrastructure/queue/queue.module';
import { CollectionProcessor } from './collection.processor';
import { OverdueProcessor } from './overdue.processor';
import { RecurrenceProcessor } from './recurrence.processor';
import { SequencesProcessor } from './sequences.processor';

@Module({
  imports: [QueueModule],
  providers: [OverdueProcessor, RecurrenceProcessor, CollectionProcessor, SequencesProcessor],
})
export class JobsModule {}
