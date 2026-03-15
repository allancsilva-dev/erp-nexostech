import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { FeatureFlagGuard } from '../../../common/guards/feature-flag.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { BranchesService } from '../../../modules/branches/branches.service';
import { AssignBranchUserDto } from '../../../modules/branches/dto/assign-branch-user.dto';
import { CreateBranchDto } from '../../../modules/branches/dto/create-branch.dto';
import { BranchResponse } from '../../../modules/branches/dto/branch.response';
import { UpdateBranchDto } from '../../../modules/branches/dto/update-branch.dto';
import type { AuthUser } from '../../../common/types/auth-user.type';

@Controller('branches')
@UseGuards(JwtGuard, BranchGuard, RbacGuard, FeatureFlagGuard)
@RequireFeature('branches_enabled')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @RequirePermission('admin.branches.manage')
  async list(): Promise<ApiResponse<BranchResponse[]>> {
    const branches = await this.branchesService.list();
    return ApiResponse.ok(
      branches.map((branch) => BranchResponse.from(branch)),
    );
  }

  @Get('my')
  async myBranches(
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse<BranchResponse[]>> {
    const branches = await this.branchesService.listForUser(user);
    return ApiResponse.ok(
      branches.map((branch) => BranchResponse.from(branch)),
    );
  }

  @Post()
  @RequirePermission('admin.branches.manage')
  async create(
    @Body() dto: CreateBranchDto,
  ): Promise<ApiResponse<BranchResponse>> {
    const created = await this.branchesService.create(dto);
    return ApiResponse.created(BranchResponse.from(created));
  }

  @Put(':id')
  @Idempotent()
  @RequirePermission('admin.branches.manage')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ): Promise<ApiResponse<BranchResponse>> {
    const updated = await this.branchesService.update(id, dto);
    return ApiResponse.ok(BranchResponse.from(updated));
  }

  @Delete(':id')
  @Idempotent()
  @RequirePermission('admin.branches.manage')
  async remove(
    @Param('id') id: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.branchesService.softDelete(id);
    return ApiResponse.ok({ deleted: true });
  }

  @Delete(':id/users/:userId')
  @Idempotent()
  @RequirePermission('admin.users.manage')
  async unlinkUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.branchesService.unlinkUser(id, userId);
    return ApiResponse.ok({ deleted: true });
  }

  @Get(':id/users')
  @RequirePermission('admin.users.manage')
  async listUsers(
    @Param('id') id: string,
  ): Promise<ApiResponse<{ userId: string }[]>> {
    return ApiResponse.ok(await this.branchesService.listUsers(id));
  }

  @Post(':id/users')
  @Idempotent()
  @RequirePermission('admin.users.manage')
  async assignUser(
    @Param('id') id: string,
    @Body() dto: AssignBranchUserDto,
  ): Promise<ApiResponse<{ branchId: string; userId: string }>> {
    return ApiResponse.created(
      await this.branchesService.assignUser(id, dto.userId),
    );
  }
}
