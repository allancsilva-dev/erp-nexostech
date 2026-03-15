import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { CreateRoleDto } from '../../../modules/rbac/dto/create-role.dto';
import { RoleResponse } from '../../../modules/rbac/dto/role.response';
import { UpdateRoleDto } from '../../../modules/rbac/dto/update-role.dto';
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

  @Put(':id')
  @Idempotent()
  @RequirePermission('admin.users.manage')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<ApiResponse<RoleResponse>> {
    const updated = await this.rolesService.update(id, dto);
    return ApiResponse.ok(RoleResponse.from(updated));
  }

  @Delete(':id')
  @Idempotent()
  @RequirePermission('admin.users.manage')
  async remove(@Param('id') id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.rolesService.softDelete(id);
    return ApiResponse.ok({ deleted: true });
  }
}
