import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { BranchesRepository } from './branches.repository';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import type { AuthUser } from '../../common/types/auth-user.type';

@Injectable()
export class BranchesService {
  constructor(private readonly branchesRepository: BranchesRepository) {}

  async list() {
    return this.branchesRepository.list();
  }

  async listForUser(user: AuthUser) {
    if (user.roles.includes('ADMIN')) {
      return this.list();
    }

    return this.branchesRepository.listByUser(user.sub);
  }

  async create(dto: CreateBranchDto) {
    return this.branchesRepository.create(dto);
  }

  async update(id: string, dto: UpdateBranchDto) {
    const existing = await this.branchesRepository.findById(id);
    if (!existing) {
      throw new BusinessException(
        'BRANCH_NOT_FOUND',
        'Filial nao encontrada',
        { id },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.branchesRepository.update(id, dto);
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.branchesRepository.findById(id);
    if (!existing) {
      throw new BusinessException(
        'BRANCH_NOT_FOUND',
        'Filial nao encontrada',
        { id },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.branchesRepository.softDelete(id);
  }

  async unlinkUser(branchId: string, userId: string): Promise<void> {
    await this.branchesRepository.unlinkUser(branchId, userId);
  }

  async listUsers(branchId: string): Promise<Array<{ userId: string }>> {
    return this.branchesRepository.listUsers(branchId);
  }

  async assignUser(
    branchId: string,
    userId: string,
  ): Promise<{ branchId: string; userId: string }> {
    await this.branchesRepository.assignUser(branchId, userId);
    return { branchId, userId };
  }
}
