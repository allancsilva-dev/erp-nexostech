import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { QueueModule } from '../../../infrastructure/queue/queue.module';
import { EventsModule } from '../../../infrastructure/events/events.module';
import { TenantsModule } from '../../tenants/tenants.module';
import { CleanupProcessor } from './cleanup.processor';
import { CollectionProcessor } from './collection.processor';
import { OverdueProcessor } from './overdue.processor';
import { DueSoonProcessor } from './due-soon.processor';
import { PaymentThanksProcessor } from './payment-thanks.processor';
import { RecurrenceProcessor } from './recurrence.processor';
import { SequencesProcessor } from './sequences.processor';

@Module({
  imports: [QueueModule, DatabaseModule, EventsModule, TenantsModule],
  providers: [
    OverdueProcessor,
    DueSoonProcessor,
    RecurrenceProcessor,
    CollectionProcessor,
    SequencesProcessor,
    PaymentThanksProcessor,
    CleanupProcessor,
  ],
})
export class JobsModule {}
