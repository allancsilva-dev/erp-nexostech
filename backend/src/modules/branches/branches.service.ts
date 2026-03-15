import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { BranchesRepository } from './branches.repository';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly branchesRepository: BranchesRepository) {}

  async list() {
    return this.branchesRepository.list();
  }

  async create(dto: CreateBranchDto) {
    return this.branchesRepository.create(dto);
  }

  async update(id: string, dto: UpdateBranchDto) {
    const existing = await this.branchesRepository.findById(id);
    if (!existing) {
      throw new BusinessException('BRANCH_NOT_FOUND', 'Filial nao encontrada', { id }, HttpStatus.NOT_FOUND);
    }

    return this.branchesRepository.update(id, dto);
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.branchesRepository.findById(id);
    if (!existing) {
      throw new BusinessException('BRANCH_NOT_FOUND', 'Filial nao encontrada', { id }, HttpStatus.NOT_FOUND);
    }

    await this.branchesRepository.softDelete(id);
  }
}
