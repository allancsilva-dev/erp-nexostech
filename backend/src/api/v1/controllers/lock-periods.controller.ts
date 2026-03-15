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
import { CreateLockPeriodDto } from '../../../modules/financial/lock-periods/dto/create-lock-period.dto';
import { LockPeriodsService } from '../../../modules/financial/lock-periods/lock-periods.service';

@Controller('lock-periods')
@UseGuards(JwtGuard, BranchGuard, RbacGuard)
export class LockPeriodsController {
  constructor(private readonly lockPeriodsService: LockPeriodsService) {}

  @Get()
  @RequirePermission('financial.settings.manage')
  async list(@BranchId() branchId: string): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.lockPeriodsService.list(branchId));
  }

  @Post()
  @RequirePermission('financial.settings.manage')
  async create(
    @BranchId() branchId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateLockPeriodDto,
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.created(await this.lockPeriodsService.create(branchId, user, dto));
  }

  @Delete(':id')
  @Idempotent()
  @RequirePermission('financial.settings.manage')
  async remove(
    @Param('id') id: string,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.lockPeriodsService.softDelete(id, branchId);
    return ApiResponse.ok({ deleted: true });
  }
}
