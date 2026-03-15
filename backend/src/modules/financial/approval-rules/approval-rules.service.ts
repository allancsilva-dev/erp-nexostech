import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ApprovalRulesRepository } from './approval-rules.repository';
import { CreateApprovalRuleDto } from './dto/create-approval-rule.dto';
import { UpdateApprovalRuleDto } from './dto/update-approval-rule.dto';

@Injectable()
export class ApprovalRulesService {
  constructor(private readonly approvalRulesRepository: ApprovalRulesRepository) {}

  async list(branchId: string) {
    return this.approvalRulesRepository.list(branchId);
  }

  async create(branchId: string, dto: CreateApprovalRuleDto) {
    return this.approvalRulesRepository.create(branchId, dto);
  }

  async update(id: string, branchId: string, dto: UpdateApprovalRuleDto) {
    const existing = await this.approvalRulesRepository.findById(id, branchId);
    if (!existing) {
      throw new BusinessException(
        'APPROVAL_RULE_NOT_FOUND',
        'Regra de aprovacao nao encontrada para a filial informada',
        { id, branchId },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.approvalRulesRepository.update(id, branchId, dto);
  }

  async softDelete(id: string, branchId: string): Promise<void> {
    const existing = await this.approvalRulesRepository.findById(id, branchId);
    if (!existing) {
      throw new BusinessException(
        'APPROVAL_RULE_NOT_FOUND',
        'Regra de aprovacao nao encontrada para a filial informada',
        { id, branchId },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.approvalRulesRepository.softDelete(id, branchId);
  }
}
