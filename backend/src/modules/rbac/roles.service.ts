import { Injectable } from '@nestjs/common';
import { RolesRepository } from './roles.repository';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async list() {
    return this.rolesRepository.list();
  }

  async create(dto: CreateRoleDto) {
    return this.rolesRepository.create(dto);
  }
}
