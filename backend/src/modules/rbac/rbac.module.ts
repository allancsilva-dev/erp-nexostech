import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { EventsModule } from '../../infrastructure/events/events.module';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';

@Module({
  imports: [DatabaseModule, EventsModule],
  providers: [RolesRepository, RolesService],
  exports: [RolesService],
})
export class RbacModule {}
