import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { ApprovalRulesRepository } from './approval-rules.repository';
import { ApprovalRulesService } from './approval-rules.service';

@Module({
  imports: [DatabaseModule],
  providers: [ApprovalRulesRepository, ApprovalRulesService],
  exports: [ApprovalRulesService],
})
export class ApprovalRulesModule {}
