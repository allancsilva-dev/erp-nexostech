import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { BoletosService } from '../../../modules/financial/boletos/boletos.service';
import { BoletoWebhookDto } from '../../../modules/financial/boletos/dto/boleto-webhook.dto';
import { GenerateBoletoDto } from '../../../modules/financial/boletos/dto/generate-boleto.dto';

@Controller('boletos')
export class BoletosController {
  constructor(private readonly boletosService: BoletosService) {}

  @Get()
  @UseGuards(JwtGuard, BranchGuard, RbacGuard)
  @RequirePermission('financial.entries.view')
  async list(@BranchId() branchId: string): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.boletosService.list(branchId));
  }

  @Post(':entryId/generate')
  @UseGuards(JwtGuard, BranchGuard, RbacGuard)
  @Idempotent()
  @RequirePermission('financial.entries.create')
  async generate(
    @Param('entryId') entryId: string,
    @BranchId() branchId: string,
    @Body() dto: GenerateBoletoDto,
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.created(await this.boletosService.generate(entryId, branchId, dto));
  }

  @Post(':entryId/cancel')
  @UseGuards(JwtGuard, BranchGuard, RbacGuard)
  @Idempotent()
  @RequirePermission('financial.entries.cancel')
  async cancel(
    @Param('entryId') entryId: string,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.boletosService.cancel(entryId, branchId));
  }

  @Get(':entryId/pdf')
  @UseGuards(JwtGuard, BranchGuard, RbacGuard)
  @RequirePermission('financial.entries.view')
  async pdf(
    @Param('entryId') entryId: string,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.boletosService.getPdfLink(entryId, branchId));
  }

  @Post('webhook')
  @Idempotent()
  @RequirePermission('financial.entries.edit')
  async webhook(@Body() dto: BoletoWebhookDto): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.boletosService.handleWebhook(dto));
  }
}
