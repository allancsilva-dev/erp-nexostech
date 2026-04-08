import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { EventsModule } from '../../../infrastructure/events/events.module';
import { OutboxModule } from '../../../infrastructure/outbox/outbox.module';
import { TransfersRepository } from './transfers.repository';
import { TransfersService } from './transfers.service';

@Module({
  imports: [DatabaseModule, EventsModule, OutboxModule],
  providers: [TransfersRepository, TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
