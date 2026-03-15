import { Injectable } from '@nestjs/common';
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

  async approve(entryId: string, user: AuthUser) {
    const record = await this.approvalsRepository.createApprovalRecord(entryId, user.sub, 'APPROVED');
    this.eventBus.emit('entry.approved', {
      tenantId: user.tenantId,
      entryId,
      approverId: user.sub,
    });
    return record;
  }

  async reject(entryId: string, reason: string, user: AuthUser) {
    const record = await this.approvalsRepository.createApprovalRecord(
      entryId,
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
}
