import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class TenantContextService {
  constructor(private readonly clsService: ClsService) {}

  getTenantIdOrFail(): string {
    const tenantId = this.clsService.get<string>('tenantId');
    if (!tenantId) {
      throw new BusinessException('UNAUTHORIZED', 'Tenant não encontrado no contexto', undefined, 401);
    }
    return tenantId;
  }

  getTenantSchema(): string {
    return `tenant_${this.getTenantIdOrFail()}`;
  }
}
