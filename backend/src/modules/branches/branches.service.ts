import { Injectable, HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import { quoteIdent } from '../../infrastructure/database/sql-builder.util';
import { OnboardingService } from '../onboarding/onboarding.service';
import { BranchesRepository } from './branches.repository';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import type { AuthUser } from '../../common/types/auth-user.type';

@Injectable()
export class BranchesService {
  constructor(
    private readonly branchesRepository: BranchesRepository,
    private readonly onboardingService: OnboardingService,
    private readonly drizzleService: DrizzleService,
  ) {}

  async list() {
    return this.branchesRepository.list();
  }

  async listForUser(user: AuthUser) {
    if (user.roles.includes('ADMIN')) {
      return this.list();
    }

    return this.branchesRepository.listByUser(user.sub);
  }

  async create(dto: CreateBranchDto, user: AuthUser) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());

    return this.drizzleService.transaction(async (tx) => {
      const branch = await this.branchesRepository.create(dto, tx);

      await this.onboardingService.onboardBranch(tx, {
        branchId: branch.id,
        adminUserId: user.sub,
        schema,
      });

      return branch;
    });
  }

  async update(id: string, dto: UpdateBranchDto) {
    const existing = await this.branchesRepository.findById(id);
    if (!existing) {
      throw new BusinessException('BRANCH_NOT_FOUND', HttpStatus.NOT_FOUND, {
        id,
      });
    }

    return this.branchesRepository.update(id, dto);
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.branchesRepository.findById(id);
    if (!existing) {
      throw new BusinessException('BRANCH_NOT_FOUND', HttpStatus.NOT_FOUND, {
        id,
      });
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
