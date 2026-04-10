import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoriesRepository } from './categories.repository';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryEntity } from './dto/category.response';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  private async ensureParentExists(
    parentId: string,
    branchId: string,
  ): Promise<CategoryEntity> {
    const parent = await this.categoriesRepository.findById(parentId, branchId);
    if (!parent) {
      throw new BusinessException('CATEGORY_NOT_FOUND', HttpStatus.NOT_FOUND, {
        parentId,
        branchId,
      });
    }

    return parent;
  }

  private async ensureNoHierarchyCycle(
    categoryId: string,
    parentId: string,
    branchId: string,
  ): Promise<void> {
    if (parentId === categoryId) {
      throw new BusinessException('VALIDATION_ERROR', HttpStatus.BAD_REQUEST, {
        field: 'parentId',
        message: 'Categoria nao pode ser pai de si mesma',
      });
    }

    let currentParent = await this.ensureParentExists(parentId, branchId);

    while (currentParent.parentId) {
      if (currentParent.parentId === categoryId) {
        throw new BusinessException(
          'VALIDATION_ERROR',
          HttpStatus.BAD_REQUEST,
          {
            field: 'parentId',
            message: 'Criaria um ciclo na hierarquia de categorias',
          },
        );
      }

      currentParent = await this.ensureParentExists(
        currentParent.parentId,
        branchId,
      );
    }
  }

  async list(branchId: string) {
    return this.categoriesRepository.list(branchId);
  }

  async findById(id: string, branchId: string) {
    return this.categoriesRepository.findById(id, branchId);
  }

  async create(branchId: string, dto: CreateCategoryDto) {
    if (dto.parentId) {
      await this.ensureParentExists(dto.parentId, branchId);
    }

    return this.categoriesRepository.create(branchId, dto);
  }

  async update(id: string, branchId: string, dto: UpdateCategoryDto) {
    const existing = await this.categoriesRepository.findById(id, branchId);
    if (!existing) {
      throw new BusinessException('CATEGORY_NOT_FOUND', HttpStatus.NOT_FOUND, {
        id,
        branchId,
      });
    }

    if (dto.parentId) {
      await this.ensureNoHierarchyCycle(id, dto.parentId, branchId);
    }

    return this.categoriesRepository.update(id, branchId, dto);
  }

  async softDelete(id: string, branchId: string): Promise<void> {
    const existing = await this.categoriesRepository.findById(id, branchId);
    if (!existing) {
      throw new BusinessException('CATEGORY_NOT_FOUND', HttpStatus.NOT_FOUND, {
        id,
        branchId,
      });
    }

    await this.categoriesRepository.softDelete(id, branchId);
  }
}
