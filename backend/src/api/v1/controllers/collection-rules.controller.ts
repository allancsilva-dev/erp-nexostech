import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { CollectionRulesService } from '../../../modules/financial/collection-rules/collection-rules.service';
import { CreateCollectionRuleDto } from '../../../modules/financial/collection-rules/dto/create-collection-rule.dto';

@Controller()
@UseGuards(JwtGuard, BranchGuard, RbacGuard)
export class CollectionRulesController {
  constructor(private readonly collectionRulesService: CollectionRulesService) {}

  @Get('collection-rules')
  @RequirePermission('financial.settings.manage')
  async list(@BranchId() branchId: string): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.collectionRulesService.list(branchId));
  }

  @Post('collection-rules')
  @RequirePermission('financial.settings.manage')
  async create(
    @BranchId() branchId: string,
    @Body() dto: CreateCollectionRuleDto,
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.created(await this.collectionRulesService.create(branchId, dto));
  }

  @Post('email-templates/:id/preview')
  @RequirePermission('financial.settings.manage')
  async preview(
    @Param('id') templateId: string,
    @Query('nome_cliente') nomeCliente = 'Cliente',
    @Query('valor') valor = '0.00',
    @Query('vencimento') vencimento = '-',
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(
      await this.collectionRulesService.previewTemplate(templateId, {
        nome_cliente: nomeCliente,
        valor,
        vencimento,
      }),
    );
  }
}
