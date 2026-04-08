import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { EventsModule } from '../../../infrastructure/events/events.module';
import { OutboxModule } from '../../../infrastructure/outbox/outbox.module';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

@Module({
  imports: [DatabaseModule, EventsModule, OutboxModule],
  providers: [PaymentsRepository, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
