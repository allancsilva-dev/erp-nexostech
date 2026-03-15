import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';

@Module({
  imports: [DatabaseModule],
  providers: [RolesRepository, RolesService],
  exports: [RolesService],
})
export class RbacModule {}
