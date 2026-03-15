import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { PaginationDto } from '../../../common/dtos/pagination.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { AuditService } from '../../../modules/financial/audit/audit.service';

@Controller('audit-logs')
@UseGuards(JwtGuard, BranchGuard, RbacGuard)
export class AuditLogsController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('financial.audit.view')
  async list(@Query() query: PaginationDto): Promise<ApiResponse<unknown[]>> {
    const { items, total } = await this.auditService.list(query.page, query.pageSize);
    return ApiResponse.paginated(items, {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    });
  }
}
