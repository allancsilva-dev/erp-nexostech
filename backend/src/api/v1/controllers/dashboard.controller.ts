import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { DashboardService } from '../../../modules/financial/dashboard/dashboard.service';

@Controller('dashboard')
@UseGuards(JwtGuard, BranchGuard, RbacGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @RequirePermission('financial.dashboard.view')
  async summary(
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.dashboardService.getSummary(
      user.tenantId,
      branchId,
    );
    return ApiResponse.ok(data);
  }

  @Get('overdue')
  @RequirePermission('financial.dashboard.view')
  async overdue(
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.dashboardService.getOverdue(
      user.tenantId,
      branchId,
    );
    return ApiResponse.ok(data);
  }

  @Get('cashflow-chart')
  @RequirePermission('financial.dashboard.view')
  async cashflow(
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
    @Query('period') period = '12m',
  ): Promise<ApiResponse<unknown>> {
    const data = await this.dashboardService.getCashflowChart(
      user.tenantId,
      branchId,
      period,
    );
    return ApiResponse.ok(data);
  }
}
