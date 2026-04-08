import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { DatabaseModule } from '../database/database.module';
import { EventsModule } from '../events/events.module';
import { OutboxService } from './outbox.service';
import { OutboxWorker } from './outbox.worker';

@Module({
  imports: [DatabaseModule, EventsModule, ClsModule],
  providers: [OutboxService, OutboxWorker],
  exports: [OutboxService],
})
export class OutboxModule {}