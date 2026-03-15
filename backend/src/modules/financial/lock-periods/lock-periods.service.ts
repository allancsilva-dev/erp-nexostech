import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { CreateLockPeriodDto } from './dto/create-lock-period.dto';
import { LockPeriodsRepository } from './lock-periods.repository';

@Injectable()
export class LockPeriodsService {
  constructor(private readonly lockPeriodsRepository: LockPeriodsRepository) {}

  async list(branchId: string) {
    return this.lockPeriodsRepository.list(branchId);
  }

  async create(branchId: string, user: AuthUser, dto: CreateLockPeriodDto) {
    return this.lockPeriodsRepository.create(branchId, user.sub, dto);
  }
}
