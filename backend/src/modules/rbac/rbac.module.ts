import { Module } from '@nestjs/common';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { EventsModule } from '../../infrastructure/events/events.module';
import { OutboxModule } from '../../infrastructure/outbox/outbox.module';
import { AuthApiService } from './auth-api.service';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';

@Module({
  imports: [DatabaseModule, CacheModule, EventsModule, OutboxModule],
  providers: [RolesRepository, RolesService, AuthApiService],
  exports: [RolesService],
})
export class RbacModule {}
