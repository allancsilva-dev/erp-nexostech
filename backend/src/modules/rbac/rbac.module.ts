import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { EventsModule } from '../../infrastructure/events/events.module';
import { AuthApiService } from './auth-api.service';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';

@Module({
  imports: [DatabaseModule, EventsModule],
  providers: [RolesRepository, RolesService, AuthApiService],
  exports: [RolesService],
})
export class RbacModule {}
