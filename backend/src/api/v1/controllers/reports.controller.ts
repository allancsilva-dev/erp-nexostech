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
import { ExportReportDto } from '../../../modules/financial/reports/dto/export-report.dto';
import { ReportExportDto } from '../../../modules/financial/reports/dto/report-export.dto';
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

  @Get('balance-sheet')
  @RequirePermission('financial.reports.view')
  async balanceSheet(
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
    @Query() query: ReportPeriodDto,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.reportsService.getBalanceSheet(
      user.tenantId,
      branchId,
      query.startDate,
      query.endDate,
    );
    return ApiResponse.ok(data);
  }

  @Get('aging')
  @RequirePermission('financial.reports.view')
  async aging(
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
    @Query() query: ReportPeriodDto,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.reportsService.getAging(
      user.tenantId,
      branchId,
      query.startDate,
      query.endDate,
    );
    return ApiResponse.ok(data);
  }

  @Get('dre/export')
  @RequirePermission('financial.reports.view')
  async exportDre(
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
    @Query() query: ExportReportDto,
  ): Promise<ApiResponse<{ format: string; filename: string; content: string }>> {
    const data = await this.reportsService.exportDre(
      user.tenantId,
      branchId,
      query.startDate,
      query.endDate,
      query.format,
    );
    return ApiResponse.ok(data);
  }

  @Get('cashflow/export')
  @RequirePermission('financial.reports.view')
  async exportCashflow(
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
    @Query() query: ExportReportDto,
  ): Promise<ApiResponse<{ format: string; filename: string; content: string }>> {
    const data = await this.reportsService.exportCashflow(
      user.tenantId,
      branchId,
      query.startDate,
      query.endDate,
      query.format,
    );
    return ApiResponse.ok(data);
  }

  @Get('export')
  @RequirePermission('financial.reports.export')
  async exportUnified(
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
    @Query() query: ReportExportDto,
  ): Promise<ApiResponse<{ format: string; filename: string; content: string }>> {
    const data = await this.reportsService.export(
      user.tenantId,
      branchId,
      query.report,
      query.startDate,
      query.endDate,
      query.format,
    );
    return ApiResponse.ok(data);
  }
}
