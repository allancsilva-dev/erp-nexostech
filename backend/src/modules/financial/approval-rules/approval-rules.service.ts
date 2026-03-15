import { Injectable } from '@nestjs/common';
import { ApprovalRulesRepository } from './approval-rules.repository';
import { CreateApprovalRuleDto } from './dto/create-approval-rule.dto';

@Injectable()
export class ApprovalRulesService {
  constructor(private readonly approvalRulesRepository: ApprovalRulesRepository) {}

  async list(branchId: string) {
    return this.approvalRulesRepository.list(branchId);
  }

  async create(branchId: string, dto: CreateApprovalRuleDto) {
    return this.approvalRulesRepository.create(branchId, dto);
  }
}
