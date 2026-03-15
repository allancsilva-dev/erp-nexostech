import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { EventsModule } from '../../../infrastructure/events/events.module';
import { TransfersRepository } from './transfers.repository';
import { TransfersService } from './transfers.service';

@Module({
  imports: [DatabaseModule, EventsModule],
  providers: [TransfersRepository, TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
