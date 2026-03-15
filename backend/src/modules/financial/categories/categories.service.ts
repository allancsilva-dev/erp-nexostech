import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoriesRepository } from './categories.repository';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async list(branchId: string) {
    return this.categoriesRepository.list(branchId);
  }

  async create(branchId: string, dto: CreateCategoryDto) {
    return this.categoriesRepository.create(branchId, dto);
  }

  async update(id: string, branchId: string, dto: UpdateCategoryDto) {
    const existing = await this.categoriesRepository.findById(id, branchId);
    if (!existing) {
      throw new BusinessException(
        'CATEGORY_NOT_FOUND',
        'Categoria nao encontrada para a filial informada',
        { id, branchId },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.categoriesRepository.update(id, branchId, dto);
  }

  async softDelete(id: string, branchId: string): Promise<void> {
    const existing = await this.categoriesRepository.findById(id, branchId);
    if (!existing) {
      throw new BusinessException(
        'CATEGORY_NOT_FOUND',
        'Categoria nao encontrada para a filial informada',
        { id, branchId },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.categoriesRepository.softDelete(id, branchId);
  }
}
