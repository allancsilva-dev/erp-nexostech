import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { BranchEntity } from './dto/branch.response';

@Injectable()
export class BranchesRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(): Promise<BranchEntity[]> {
    this.drizzleService.getTenantDb();
    return [];
  }

  async create(dto: CreateBranchDto): Promise<BranchEntity> {
    this.drizzleService.getTenantDb();
    return {
      id: randomUUID(),
      name: dto.name,
      legalName: dto.legalName ?? null,
      document: dto.document ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      addressCity: dto.addressCity ?? null,
      addressState: dto.addressState ?? null,
      addressZip: dto.addressZip ?? null,
      isHeadquarters: false,
      active: true,
    };
  }
}
