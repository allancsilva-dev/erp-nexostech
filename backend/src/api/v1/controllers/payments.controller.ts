import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { PaymentResponse } from '../../../modules/financial/payments/dto/payment.response';
import { RefundPaymentDto } from '../../../modules/financial/payments/dto/refund-payment.dto';
import { RegisterPaymentDto } from '../../../modules/financial/payments/dto/register-payment.dto';
import { PaymentsService } from '../../../modules/financial/payments/payments.service';
import { BatchPayDto } from '../../../modules/financial/payments/dto/batch-pay.dto';

@Controller('entries')
@UseGuards(JwtGuard, BranchGuard, RbacGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':id/payments')
  @RequirePermission('financial.entries.view')
  async listByEntry(
    @Param('id') entryId: string,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<PaymentResponse[]>> {
    const payments = await this.paymentsService.listByEntry(entryId, branchId);
    return ApiResponse.ok(
      payments.map((payment) => PaymentResponse.from(payment)),
    );
  }

  @Post(':id/pay')
  @Idempotent()
  @RequirePermission('financial.entries.pay')
  async register(
    @Param('id') entryId: string,
    @Body() dto: RegisterPaymentDto,
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<PaymentResponse>> {
    const payment = await this.paymentsService.registerPayment(
      entryId,
      dto,
      user,
      branchId,
    );
    return ApiResponse.created(PaymentResponse.from(payment));
  }

  @Post(':id/refund')
  @Idempotent()
  @RequirePermission('financial.entries.cancel')
  async refund(
    @Param('id') entryId: string,
    @Body() dto: RefundPaymentDto,
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<PaymentResponse | null>> {
    const payment = await this.paymentsService.refund(
      entryId,
      dto,
      user,
      branchId,
    );
    return ApiResponse.ok(payment ? PaymentResponse.from(payment) : null);
  }

  @Post('batch-pay')
  @Idempotent()
  @RequirePermission('financial.entries.pay')
  async batchPay(
    @Body() dto: BatchPayDto,
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<PaymentResponse[]>> {
    const payments = await this.paymentsService.batchPay(dto, user, branchId);
    return ApiResponse.created(
      payments.map((payment) => PaymentResponse.from(payment)),
    );
  }
}
