import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { SettingsService } from '../../../modules/financial/settings/settings.service';
import { UpdateSettingsDto } from '../../../modules/financial/settings/dto/update-settings.dto';

@Controller('settings')
@UseGuards(JwtGuard, BranchGuard, RbacGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermission('financial.settings.manage')
  async get(@BranchId() branchId: string): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.settingsService.get(branchId));
  }

  @Put()
  @RequirePermission('financial.settings.manage')
  async update(
    @BranchId() branchId: string,
    @Body() dto: UpdateSettingsDto,
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.settingsService.update(branchId, dto));
  }
}
