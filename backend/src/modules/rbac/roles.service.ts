import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { RolesRepository } from './roles.repository';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async list() {
    return this.rolesRepository.list();
  }

  async create(dto: CreateRoleDto) {
    return this.rolesRepository.create(dto);
  }

  async update(id: string, dto: UpdateRoleDto) {
    const existing = await this.rolesRepository.findById(id);
    if (!existing) {
      throw new BusinessException('ROLE_NOT_FOUND', 'Role nao encontrada', { id }, HttpStatus.NOT_FOUND);
    }

    if (existing.isSystem) {
      throw new BusinessException('ROLE_SYSTEM_LOCKED', 'Role de sistema nao pode ser editada', { id }, HttpStatus.FORBIDDEN);
    }

    return this.rolesRepository.update(id, dto);
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.rolesRepository.findById(id);
    if (!existing) {
      throw new BusinessException('ROLE_NOT_FOUND', 'Role nao encontrada', { id }, HttpStatus.NOT_FOUND);
    }

    if (existing.isSystem) {
      throw new BusinessException('ROLE_SYSTEM_LOCKED', 'Role de sistema nao pode ser excluida', { id }, HttpStatus.FORBIDDEN);
    }

    await this.rolesRepository.softDelete(id);
  }
}
