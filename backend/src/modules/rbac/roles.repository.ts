import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleEntity } from './dto/role.response';

@Injectable()
export class RolesRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(): Promise<RoleEntity[]> {
    this.drizzleService.getTenantDb();
    return [];
  }

  async create(dto: CreateRoleDto): Promise<RoleEntity> {
    this.drizzleService.getTenantDb();
    return {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
      isSystem: false,
      permissions: dto.permissionCodes,
    };
  }
}
