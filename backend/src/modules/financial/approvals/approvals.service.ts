import { Injectable } from '@nestjs/common';
import { BusinessException } from '../../../common/exceptions/business.exception';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { EventBusService } from '../../../infrastructure/events/event-bus.service';
import { ApprovalsRepository } from './approvals.repository';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly approvalsRepository: ApprovalsRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async listPending(branchId: string) {
    return this.approvalsRepository.listPending(branchId);
  }

  async approve(entryId: string, branchId: string, user: AuthUser) {
    // Verifica se o aprovador é o mesmo que criou o lançamento (proibido pela especificação)
    const entry = await this.approvalsRepository.findEntryCreator(
      entryId,
      branchId,
    );
    if (entry && entry.createdBy === user.sub) {
      throw new BusinessException(
        'APPROVAL_SELF_FORBIDDEN',
        'O criador do lancamento nao pode aprovar a propria solicitacao',
        { entryId, approverId: user.sub },
      );
    }

    const record = await this.approvalsRepository.createApprovalRecord(
      entryId,
      branchId,
      user.sub,
      'APPROVED',
    );
    this.eventBus.emit('entry.approved', {
      tenantId: user.tenantId,
      entryId,
      approverId: user.sub,
    });
    return record;
  }

  async reject(
    entryId: string,
    branchId: string,
    reason: string,
    user: AuthUser,
  ) {
    const record = await this.approvalsRepository.createApprovalRecord(
      entryId,
      branchId,
      user.sub,
      'REJECTED',
      reason,
    );
    this.eventBus.emit('entry.rejected', {
      tenantId: user.tenantId,
      entryId,
      approverId: user.sub,
      reason,
    });
    return record;
  }

  async batchApprove(entryIds: string[], branchId: string, user: AuthUser) {
    const approved: unknown[] = [];
    for (const entryId of entryIds) {
      approved.push(await this.approve(entryId, branchId, user));
    }

    return approved;
  }

  async history(branchId: string) {
    return this.approvalsRepository.history(branchId);
  }
}
