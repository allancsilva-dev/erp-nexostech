import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { BankAccountsService } from '../../../modules/financial/bank-accounts/bank-accounts.service';
import { CreateBankAccountDto } from '../../../modules/financial/bank-accounts/dto/create-bank-account.dto';
import { BankAccountResponse } from '../../../modules/financial/bank-accounts/dto/bank-account.response';

@Controller('bank-accounts')
@UseGuards(JwtGuard, BranchGuard, RbacGuard)
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Get()
  @RequirePermission('financial.entries.view')
  async list(@BranchId() branchId: string): Promise<ApiResponse<BankAccountResponse[]>> {
    const items = await this.bankAccountsService.list(branchId);
    return ApiResponse.ok(items.map((item) => BankAccountResponse.from(item)));
  }

  @Post()
  @RequirePermission('financial.bank_accounts.manage')
  async create(@Body() dto: CreateBankAccountDto): Promise<ApiResponse<BankAccountResponse>> {
    const created = await this.bankAccountsService.create(dto);
    return ApiResponse.created(BankAccountResponse.from(created));
  }
}
