import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { CreateRoleDto } from '../../../modules/rbac/dto/create-role.dto';
import { RoleResponse } from '../../../modules/rbac/dto/role.response';
import { RolesService } from '../../../modules/rbac/roles.service';

@Controller('roles')
@UseGuards(JwtGuard, RbacGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('admin.users.manage')
  async list(): Promise<ApiResponse<RoleResponse[]>> {
    const roles = await this.rolesService.list();
    return ApiResponse.ok(roles.map((role) => RoleResponse.from(role)));
  }

  @Post()
  @RequirePermission('admin.users.manage')
  async create(@Body() dto: CreateRoleDto): Promise<ApiResponse<RoleResponse>> {
    const created = await this.rolesService.create(dto);
    return ApiResponse.created(RoleResponse.from(created));
  }
}
