import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { BranchesRepository } from './branches.repository';
import { BranchesService } from './branches.service';

@Module({
  imports: [DatabaseModule],
  providers: [BranchesRepository, BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
