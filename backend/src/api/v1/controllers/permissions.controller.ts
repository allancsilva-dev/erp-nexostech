import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { RolesService } from '../../../modules/rbac/roles.service';

@Controller('permissions')
@UseGuards(JwtGuard, RbacGuard)
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('admin.users.manage')
  list(): ApiResponse<unknown> {
    return ApiResponse.ok(this.rolesService.listSystemPermissions());
  }
}
