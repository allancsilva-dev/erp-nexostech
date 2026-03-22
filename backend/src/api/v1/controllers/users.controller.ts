import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { AssignUserRoleDto } from '../../../modules/rbac/dto/assign-user-role.dto';
import { CreateUserDto } from '../../../modules/rbac/dto/create-user.dto';
import { UpdateUserBranchesDto } from '../../../modules/rbac/dto/update-user-branches.dto';
import { RolesService } from '../../../modules/rbac/roles.service';

@Controller('users')
export class UsersController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('me')
  @UseGuards(JwtGuard)
  async me(@CurrentUser() user: AuthUser): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.rolesService.getCurrentUserProfile(user));
  }

  @Get('me/permissions')
  @UseGuards(JwtGuard, RbacGuard)
  async mePermissions(
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse<string[]>> {
    return ApiResponse.ok(
      await this.rolesService.listCurrentUserPermissions(user),
    );
  }

  @Get(':id/roles')
  @UseGuards(JwtGuard, RbacGuard)
  @RequirePermission('admin.users.manage')
  async listRoles(
    @Param('id') userId: string,
  ): Promise<ApiResponse<{ roleId: string; roleName: string }[]>> {
    return ApiResponse.ok(await this.rolesService.listUserRoles(userId));
  }

  @Get()
  @UseGuards(JwtGuard, RbacGuard)
  @RequirePermission('admin.users.manage')
  async listUsers(): Promise<ApiResponse<unknown[]>> {
    return ApiResponse.ok(await this.rolesService.listUsers());
  }

  @Post()
  @UseGuards(JwtGuard, RbacGuard)
  @Idempotent()
  @RequirePermission('admin.users.manage')
  async createUser(
    @Body() dto: CreateUserDto,
  ): Promise<ApiResponse<{ userId: string }>> {
    return ApiResponse.created(await this.rolesService.createUser(dto));
  }

  @Patch(':userId/branches')
  @UseGuards(JwtGuard, RbacGuard)
  @RequirePermission('admin.users.manage')
  async updateUserBranches(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserBranchesDto,
  ): Promise<ApiResponse<{ updated: true }>> {
    return ApiResponse.ok(
      await this.rolesService.updateUserBranches(userId, dto.branchIds),
    );
  }

  @Post(':id/roles')
  @UseGuards(JwtGuard, RbacGuard)
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
