import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { CreateTenantDto } from '../../../modules/tenants/dto/create-tenant.dto';
import { TenantsService } from '../../../modules/tenants/tenants.service';

@Controller('tenants')
@UseGuards(JwtGuard, RbacGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @RequirePermission('admin.users.manage')
  async list(): Promise<ApiResponse<unknown[]>> {
    return ApiResponse.ok(await this.tenantsService.list());
  }

  @Post('onboarding')
  @Idempotent()
  @RequirePermission('admin.users.manage')
  async onboarding(@Body() dto: CreateTenantDto): Promise<ApiResponse<unknown>> {
    return ApiResponse.created(await this.tenantsService.onboard(dto));
  }
}
