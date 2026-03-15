import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { RejectApprovalDto } from '../../../modules/financial/approvals/dto/reject-approval.dto';
import { ApprovalsService } from '../../../modules/financial/approvals/approvals.service';

@Controller('approvals')
@UseGuards(JwtGuard, BranchGuard, RbacGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get('pending')
  @RequirePermission('financial.entries.approve')
  async pending(@BranchId() branchId: string): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.approvalsService.listPending(branchId));
  }

  @Post(':entryId/approve')
  @RequirePermission('financial.entries.approve')
  async approve(
    @Param('entryId') entryId: string,
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.approvalsService.approve(entryId, branchId, user));
  }

  @Post(':entryId/reject')
  @RequirePermission('financial.entries.approve')
  async reject(
    @Param('entryId') entryId: string,
    @Body() dto: RejectApprovalDto,
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.approvalsService.reject(entryId, branchId, dto.reason, user));
  }
}
