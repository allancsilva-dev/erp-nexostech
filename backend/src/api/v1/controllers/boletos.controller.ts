import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { BoletosService } from '../../../modules/financial/boletos/boletos.service';
import { GenerateBoletoDto } from '../../../modules/financial/boletos/dto/generate-boleto.dto';

@Controller('boletos')
@UseGuards(JwtGuard, RbacGuard)
export class BoletosController {
  constructor(private readonly boletosService: BoletosService) {}

  @Get()
  @RequirePermission('financial.entries.view')
  async list(): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.boletosService.list());
  }

  @Post(':entryId/generate')
  @Idempotent()
  @RequirePermission('financial.entries.create')
  async generate(
    @Param('entryId') entryId: string,
    @Body() dto: GenerateBoletoDto,
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.created(await this.boletosService.generate(entryId, dto));
  }

  @Post(':entryId/cancel')
  @Idempotent()
  @RequirePermission('financial.entries.cancel')
  async cancel(@Param('entryId') entryId: string): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.boletosService.cancel(entryId));
  }

  @Get(':entryId/pdf')
  @RequirePermission('financial.entries.view')
  async pdf(@Param('entryId') entryId: string): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.boletosService.getPdfLink(entryId));
  }
}
