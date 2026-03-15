import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoriesRepository } from './categories.repository';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async list(branchId: string) {
    return this.categoriesRepository.list(branchId);
  }

  async create(branchId: string, dto: CreateCategoryDto) {
    return this.categoriesRepository.create(branchId, dto);
  }
}
