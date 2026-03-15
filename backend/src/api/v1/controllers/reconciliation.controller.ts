import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { ImportReconciliationDto } from '../../../modules/financial/reconciliation/dto/import-reconciliation.dto';
import { MatchReconciliationDto } from '../../../modules/financial/reconciliation/dto/match-reconciliation.dto';
import { ReconciliationService } from '../../../modules/financial/reconciliation/reconciliation.service';

@Controller('reconciliation')
@UseGuards(JwtGuard, BranchGuard, RbacGuard)
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get('pending')
  @RequirePermission('financial.entries.view')
  async listPending(@BranchId() branchId: string): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.reconciliationService.listPending(branchId));
  }

  @Post('import')
  @Idempotent()
  @RequirePermission('financial.reconciliation.execute')
  async import(
    @BranchId() branchId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportReconciliationDto,
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.created(await this.reconciliationService.importBatch(branchId, user, dto));
  }

  @Get(':batchId')
  @RequirePermission('financial.reconciliation.execute')
  async batchItems(
    @Param('batchId') batchId: string,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.reconciliationService.getBatchItems(batchId, branchId));
  }

  @Post('match')
  @Idempotent()
  @RequirePermission('financial.reconciliation.execute')
  async match(
    @Body() dto: MatchReconciliationDto,
    @BranchId() branchId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.reconciliationService.match(dto.itemId, dto.entryId, branchId, user));
  }

  @Delete(':batchId')
  @Idempotent()
  @RequirePermission('admin.users.manage')
  async undo(
    @Param('batchId') batchId: string,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.reconciliationService.undo(batchId, branchId);
    return ApiResponse.ok({ deleted: true });
  }
}
