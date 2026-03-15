import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { ReportPeriodDto } from '../../../modules/financial/reports/dto/report-period.dto';
import { ReportsService } from '../../../modules/financial/reports/reports.service';

@Controller('reports')
@UseGuards(JwtGuard, BranchGuard, RbacGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dre')
  @RequirePermission('financial.reports.view')
  async dre(
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
    @Query() query: ReportPeriodDto,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.reportsService.getDre(
      user.tenantId,
      branchId,
      query.startDate,
      query.endDate,
    );
    return ApiResponse.ok(data);
  }

  @Get('cashflow')
  @RequirePermission('financial.reports.view')
  async cashflow(
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
    @Query() query: ReportPeriodDto,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.reportsService.getCashflow(
      user.tenantId,
      branchId,
      query.startDate,
      query.endDate,
    );
    return ApiResponse.ok(data);
  }
}
