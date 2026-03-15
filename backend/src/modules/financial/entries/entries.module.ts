import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { EventsModule } from '../../../infrastructure/events/events.module';
import { EntriesRepository } from './entries.repository';
import { EntriesService } from './entries.service';

@Module({
  imports: [DatabaseModule, EventsModule],
  providers: [EntriesService, EntriesRepository],
  exports: [EntriesService],
})
export class EntriesModule {}
