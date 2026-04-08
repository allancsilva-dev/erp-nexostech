import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { EventsModule } from '../../../infrastructure/events/events.module';
import { OutboxModule } from '../../../infrastructure/outbox/outbox.module';
import { ApprovalsRepository } from './approvals.repository';
import { ApprovalsService } from './approvals.service';

@Module({
  imports: [DatabaseModule, EventsModule, OutboxModule],
  providers: [ApprovalsRepository, ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
