import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { EventsModule } from '../../../infrastructure/events/events.module';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

@Module({
  imports: [DatabaseModule, EventsModule],
  providers: [PaymentsRepository, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
