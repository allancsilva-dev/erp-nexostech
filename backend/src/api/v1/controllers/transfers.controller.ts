import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { CreateTransferDto } from '../../../modules/financial/transfers/dto/create-transfer.dto';
import { TransferResponse } from '../../../modules/financial/transfers/dto/transfer.response';
import { TransfersService } from '../../../modules/financial/transfers/transfers.service';

@Controller('transfers')
@UseGuards(JwtGuard, BranchGuard, RbacGuard)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Get()
  @RequirePermission('financial.entries.view')
  async list(@BranchId() branchId: string): Promise<ApiResponse<TransferResponse[]>> {
    const items = await this.transfersService.list(branchId);
    return ApiResponse.ok(items.map((item) => TransferResponse.from(item)));
  }

  @Post()
  @RequirePermission('financial.entries.create')
  async create(
    @BranchId() branchId: string,
    @Body() dto: CreateTransferDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse<TransferResponse>> {
    const created = await this.transfersService.create(branchId, dto, user);
    return ApiResponse.created(TransferResponse.from(created));
  }
}
