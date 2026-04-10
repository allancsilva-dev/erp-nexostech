import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { BranchesRepository } from './branches.repository';
import { BranchesService } from './branches.service';

@Module({
  imports: [DatabaseModule, OnboardingModule],
  providers: [BranchesRepository, BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
