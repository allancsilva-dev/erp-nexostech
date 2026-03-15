import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { PaymentResponse } from '../../../modules/financial/payments/dto/payment.response';
import { RefundPaymentDto } from '../../../modules/financial/payments/dto/refund-payment.dto';
import { RegisterPaymentDto } from '../../../modules/financial/payments/dto/register-payment.dto';
import { PaymentsService } from '../../../modules/financial/payments/payments.service';

@Controller('entries')
@UseGuards(JwtGuard, BranchGuard, RbacGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':id/pay')
  @RequirePermission('financial.entries.pay')
  async register(
    @Param('id') entryId: string,
    @Body() dto: RegisterPaymentDto,
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<PaymentResponse>> {
    const payment = await this.paymentsService.registerPayment(entryId, dto, user, branchId);
    return ApiResponse.created(PaymentResponse.from(payment));
  }

  @Post(':id/refund')
  @RequirePermission('financial.entries.cancel')
  async refund(
    @Param('id') entryId: string,
    @Body() dto: RefundPaymentDto,
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<PaymentResponse | null>> {
    const payment = await this.paymentsService.refund(entryId, dto, user, branchId);
    return ApiResponse.ok(payment ? PaymentResponse.from(payment) : null);
  }
}
