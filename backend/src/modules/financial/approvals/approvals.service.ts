import { HttpStatus, Injectable } from '@nestjs/common';
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
    const entry = await this.approvalsRepository.findEntryForApproval(entryId, branchId);

    if (!entry) {
      throw new BusinessException('ENTRY_NOT_FOUND', HttpStatus.NOT_FOUND, { entryId, branchId });
    }

    if (entry.status !== 'PENDING_APPROVAL') {
      throw new BusinessException('ENTRY_INVALID_STATUS_APPROVE', HttpStatus.CONFLICT, {
        entryId,
        currentStatus: entry.status,
      });
    }

    if (entry.createdBy === user.sub) {
      throw new BusinessException(
        'APPROVAL_SELF_FORBIDDEN',
        undefined,
        { entryId, approverId: user.sub },
      );
    }

    const record = await this.approvalsRepository.createApprovalRecord(
      entryId,
      branchId,
      user.sub,
      'APPROVED',
      undefined,
      entry.type,
    );

    this.eventBus.emit('entry.approved', {
      tenantId: user.tenantId,
      branchId,
      entryId,
      approverId: user.sub,
      createdBy: entry.createdBy,
      documentNumber: entry.documentNumber,
      amount: entry.amount,
    });

    return record;
  }

  async reject(
    entryId: string,
    branchId: string,
    reason: string,
    user: AuthUser,
  ) {
    if (!reason || reason.trim().length < 10) {
      throw new BusinessException('VALIDATION_ERROR', 400, {
        field: 'reason',
        minLength: 10,
      });
    }

    const entry = await this.approvalsRepository.findEntryForApproval(entryId, branchId);

    if (!entry) {
      throw new BusinessException('ENTRY_NOT_FOUND', HttpStatus.NOT_FOUND, { entryId, branchId });
    }

    if (entry.status !== 'PENDING_APPROVAL') {
      throw new BusinessException('ENTRY_INVALID_STATUS_APPROVE', HttpStatus.CONFLICT, {
        entryId,
        currentStatus: entry.status,
      });
    }

    const record = await this.approvalsRepository.createApprovalRecord(
      entryId,
      branchId,
      user.sub,
      'REJECTED',
      reason,
    );
    this.eventBus.emit('entry.rejected', {
      tenantId: user.tenantId,
      branchId,
      entryId,
      approverId: user.sub,
      createdBy: entry.createdBy,
      documentNumber: entry.documentNumber,
      amount: entry.amount,
      reason,
    });

    return record;
  }

  async batchApprove(entryIds: string[], branchId: string, user: AuthUser) {
    const results: unknown[] = [];
    const errors: Array<{ entryId: string; error: string }> = [];

    for (let i = 0; i < entryIds.length; i += 5) {
      const chunk = entryIds.slice(i, i + 5);
      const settled = await Promise.allSettled(
        chunk.map((entryId) => this.approve(entryId, branchId, user)),
      );

      for (let j = 0; j < settled.length; j++) {
        const result = settled[j]!;
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push({
            entryId: chunk[j]!,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          });
        }
      }
    }

    return { approved: results, errors };
  }

  async history(branchId: string) {
    return this.approvalsRepository.history(branchId);
  }
}
