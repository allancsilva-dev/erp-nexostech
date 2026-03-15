import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { BranchesService } from '../../../modules/branches/branches.service';
import { CreateBranchDto } from '../../../modules/branches/dto/create-branch.dto';
import { BranchResponse } from '../../../modules/branches/dto/branch.response';
import { UpdateBranchDto } from '../../../modules/branches/dto/update-branch.dto';

@Controller('branches')
@UseGuards(JwtGuard, BranchGuard, RbacGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @RequirePermission('admin.branches.manage')
  async list(): Promise<ApiResponse<BranchResponse[]>> {
    const branches = await this.branchesService.list();
    return ApiResponse.ok(branches.map((branch) => BranchResponse.from(branch)));
  }

  @Post()
  @RequirePermission('admin.branches.manage')
  async create(@Body() dto: CreateBranchDto): Promise<ApiResponse<BranchResponse>> {
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
  async remove(@Param('id') id: string): Promise<ApiResponse<{ deleted: boolean }>> {
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
}
