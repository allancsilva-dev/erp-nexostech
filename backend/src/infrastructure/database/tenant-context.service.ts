import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class TenantContextService {
  constructor(private readonly clsService: ClsService) {}

  private sanitizeTenantId(rawTenantId: string): string {
    const sanitized = rawTenantId.replace(/[^a-zA-Z0-9_]/g, '_');
    if (!sanitized) {
      throw new BusinessException('AUTH_UNAUTHORIZED', 401, {
        reason: 'INVALID_TENANT_CONTEXT',
      });
    }
    return sanitized;
  }

  getTenantIdOrFail(): string {
    const tenantId = this.clsService.get<string>('tenantId');
    if (!tenantId) {
      throw new BusinessException('AUTH_UNAUTHORIZED', 401, {
        reason: 'MISSING_TENANT_CONTEXT',
      });
    }
    return tenantId;
  }

  getTenantSchema(): string {
    return `tenant_${this.sanitizeTenantId(this.getTenantIdOrFail())}`;
  }
}
