import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { EventsModule } from '../../infrastructure/events/events.module';
import { NotificationsService } from './notifications.service';
import { NotificationProcessor } from './notification.processor';

@Module({
  imports: [DatabaseModule, QueueModule, EventsModule],
  providers: [NotificationsService, NotificationProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
