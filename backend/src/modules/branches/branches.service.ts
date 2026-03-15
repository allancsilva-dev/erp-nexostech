import { Injectable } from '@nestjs/common';
import { BranchesRepository } from './branches.repository';
import { CreateBranchDto } from './dto/create-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly branchesRepository: BranchesRepository) {}

  async list() {
    return this.branchesRepository.list();
  }

  async create(dto: CreateBranchDto) {
    return this.branchesRepository.create(dto);
  }
}
