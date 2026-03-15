import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { AssignUserRoleDto } from '../../../modules/rbac/dto/assign-user-role.dto';
import { RolesService } from '../../../modules/rbac/roles.service';

@Controller('users')
@UseGuards(JwtGuard, RbacGuard)
export class UsersController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('me/permissions')
  async mePermissions(
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse<string[]>> {
    return ApiResponse.ok(await this.rolesService.listCurrentUserPermissions(user));
  }

  @Get(':id/roles')
  @RequirePermission('admin.users.manage')
  async listRoles(
    @Param('id') userId: string,
  ): Promise<ApiResponse<{ roleId: string; roleName: string }[]>> {
    return ApiResponse.ok(await this.rolesService.listUserRoles(userId));
  }

  @Post(':id/roles')
  @Idempotent()
  @RequirePermission('admin.users.manage')
  async assignRole(
    @Param('id') userId: string,
    @Body() dto: AssignUserRoleDto,
  ): Promise<ApiResponse<{ userId: string; roleId: string }>> {
    return ApiResponse.created(
      await this.rolesService.assignRoleToUser(userId, dto.roleId),
    );
  }
}
