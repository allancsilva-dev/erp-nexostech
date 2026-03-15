import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryEntity } from './dto/category.response';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(branchId: string): Promise<CategoryEntity[]> {
    this.drizzleService.getTenantDb();
    void branchId;
    return [];
  }

  async create(branchId: string, dto: CreateCategoryDto): Promise<CategoryEntity> {
    this.drizzleService.getTenantDb();
    return {
      id: randomUUID(),
      branchId,
      name: dto.name,
      type: dto.type,
      parentId: dto.parentId ?? null,
      color: dto.color ?? null,
      active: true,
      sortOrder: dto.sortOrder ?? 0,
      createdAt: new Date().toISOString(),
    };
  }
}
