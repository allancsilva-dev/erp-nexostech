import { Injectable } from '@nestjs/common';
import { BusinessException } from '../../../common/exceptions/business.exception';
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
    // Verifica sobreposição com períodos existentes (INVALID_PERIOD_OVERLAP)
    const existing = await this.lockPeriodsRepository.list(branchId);
    const newUntil = new Date(dto.lockedUntil);

    const overlap = existing.find((period) => {
      const existingUntil = new Date(period.lockedUntil);
      // Sobreposição: novo período termina depois do início de um existente
      // e começa antes do fim de um existente.
      // Como lock_periods só têm lockedUntil (sem start), consideramos
      // sobreposição quando a nova data cai dentro de um período ativo.
      return (
        Math.abs(newUntil.getTime() - existingUntil.getTime()) <
          86_400_000 * 30 && newUntil <= existingUntil
      );
    });

    if (overlap) {
      throw new BusinessException('INVALID_PERIOD_OVERLAP', undefined, {
        conflictingPeriodId: overlap.id,
        conflictingLockedUntil: overlap.lockedUntil,
        requestedLockedUntil: dto.lockedUntil,
      });
    }

    return this.lockPeriodsRepository.create(branchId, user.sub, dto);
  }

  async softDelete(id: string, branchId: string) {
    await this.lockPeriodsRepository.softDelete(id, branchId);
  }
}
