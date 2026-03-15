import { Injectable } from '@nestjs/common';
import { AuditRepository } from './audit.repository';

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async list(page: number, pageSize: number) {
    return this.auditRepository.list(page, pageSize);
  }
}
