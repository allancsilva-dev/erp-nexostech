import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { BranchesService } from '../../../modules/branches/branches.service';
import { CreateBranchDto } from '../../../modules/branches/dto/create-branch.dto';
import { BranchResponse } from '../../../modules/branches/dto/branch.response';

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
}
