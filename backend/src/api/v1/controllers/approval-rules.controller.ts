import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { ApprovalRulesService } from '../../../modules/financial/approval-rules/approval-rules.service';
import { CreateApprovalRuleDto } from '../../../modules/financial/approval-rules/dto/create-approval-rule.dto';
import { UpdateApprovalRuleDto } from '../../../modules/financial/approval-rules/dto/update-approval-rule.dto';

@Controller('approval-rules')
@UseGuards(JwtGuard, BranchGuard, RbacGuard)
export class ApprovalRulesController {
  constructor(private readonly approvalRulesService: ApprovalRulesService) {}

  @Get()
  @RequirePermission('financial.approval_rules.manage')
  async list(@BranchId() branchId: string): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.approvalRulesService.list(branchId));
  }

  @Post()
  @RequirePermission('financial.approval_rules.manage')
  async create(
    @BranchId() branchId: string,
    @Body() dto: CreateApprovalRuleDto,
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.created(await this.approvalRulesService.create(branchId, dto));
  }

  @Put(':id')
  @Idempotent()
  @RequirePermission('financial.approval_rules.manage')
  async update(
    @Param('id') id: string,
    @BranchId() branchId: string,
    @Body() dto: UpdateApprovalRuleDto,
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.approvalRulesService.update(id, branchId, dto));
  }

  @Delete(':id')
  @Idempotent()
  @RequirePermission('financial.approval_rules.manage')
  async remove(
    @Param('id') id: string,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.approvalRulesService.softDelete(id, branchId);
    return ApiResponse.ok({ deleted: true });
  }
}
