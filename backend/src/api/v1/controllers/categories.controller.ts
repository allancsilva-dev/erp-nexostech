import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { CategoriesService } from '../../../modules/financial/categories/categories.service';
import { CreateCategoryDto } from '../../../modules/financial/categories/dto/create-category.dto';
import { CategoryResponse } from '../../../modules/financial/categories/dto/category.response';

@Controller('categories')
@UseGuards(JwtGuard, BranchGuard, RbacGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @RequirePermission('financial.categories.view')
  async list(@BranchId() branchId: string): Promise<ApiResponse<CategoryResponse[]>> {
    const categories = await this.categoriesService.list(branchId);
    return ApiResponse.ok(categories.map((item) => CategoryResponse.from(item)));
  }

  @Post()
  @RequirePermission('financial.categories.manage')
  async create(
    @BranchId() branchId: string,
    @Body() dto: CreateCategoryDto,
  ): Promise<ApiResponse<CategoryResponse>> {
    const created = await this.categoriesService.create(branchId, dto);
    return ApiResponse.created(CategoryResponse.from(created));
  }
}
