import { Injectable } from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantEntity, TenantsRepository } from './tenants.repository';

@Injectable()
export class TenantsService {
  constructor(private readonly tenantsRepository: TenantsRepository) {}

  async list(): Promise<TenantEntity[]> {
    return this.tenantsRepository.list();
  }

  async onboard(
    dto: CreateTenantDto,
    adminUserId?: string,
  ): Promise<TenantEntity> {
    return this.tenantsRepository.create(dto, adminUserId);
  }
}
