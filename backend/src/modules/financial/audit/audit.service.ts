import { Injectable } from '@nestjs/common';
import { AuditRepository } from './audit.repository';

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async list(page: number, pageSize: number) {
    return this.auditRepository.list(page, pageSize);
  }

  async exportCsv(page: number, pageSize: number) {
    const { items } = await this.auditRepository.list(page, pageSize);
    const header = 'id,branchId,userId,action,entity,entityId,requestId,createdAt';
    const rows = items
      .map((item) =>
        [
          item.id,
          item.branchId ?? '',
          item.userId,
          item.action,
          item.entity,
          item.entityId,
          item.requestId ?? '',
          item.createdAt,
        ].join(','),
      )
      .join('\n');

    return {
      filename: `audit-logs-page-${page}.csv`,
      content: [header, rows].filter(Boolean).join('\n'),
    };
  }

  async getById(id: string) {
    return this.auditRepository.getById(id);
  }
}
