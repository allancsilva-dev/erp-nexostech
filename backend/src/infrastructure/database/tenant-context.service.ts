import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class TenantContextService {
  constructor(private readonly clsService: ClsService) {}

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
    const schema = this.clsService.get<string>('tenantSchema');
    if (!schema) {
      throw new BusinessException('AUTH_UNAUTHORIZED', 401, {
        reason: 'MISSING_TENANT_SCHEMA',
      });
    }
    return schema;
  }
}
