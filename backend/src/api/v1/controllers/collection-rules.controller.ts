import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { FeatureFlagGuard } from '../../../common/guards/feature-flag.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { CollectionRulesService } from '../../../modules/financial/collection-rules/collection-rules.service';
import { CreateCollectionRuleDto } from '../../../modules/financial/collection-rules/dto/create-collection-rule.dto';
import { UpdateCollectionRuleDto } from '../../../modules/financial/collection-rules/dto/update-collection-rule.dto';
import { UpdateEmailTemplateDto } from '../../../modules/financial/collection-rules/dto/update-email-template.dto';

@Controller()
@UseGuards(JwtGuard, BranchGuard, RbacGuard, FeatureFlagGuard)
@RequireFeature('collection_rules_enabled')
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

  @Put('collection-rules/:id')
  @Idempotent()
  @RequirePermission('financial.settings.manage')
  async update(
    @Param('id') id: string,
    @BranchId() branchId: string,
    @Body() dto: UpdateCollectionRuleDto,
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.collectionRulesService.update(id, branchId, dto));
  }

  @Delete('collection-rules/:id')
  @Idempotent()
  @RequirePermission('financial.settings.manage')
  async remove(
    @Param('id') id: string,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.collectionRulesService.softDelete(id, branchId);
    return ApiResponse.ok({ deleted: true });
  }

  @Post('email-templates/:id/preview')
  @RequirePermission('financial.settings.manage')
  async preview(
    @Param('id') templateId: string,
    @BranchId() branchId: string,
    @Query('nome_cliente') nomeCliente = 'Cliente',
    @Query('valor') valor = '0.00',
    @Query('vencimento') vencimento = '-',
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(
      await this.collectionRulesService.previewTemplate(templateId, branchId, {
        nome_cliente: nomeCliente,
        valor,
        vencimento,
      }),
    );
  }

  @Get('email-templates')
  @RequirePermission('financial.settings.manage')
  async listEmailTemplates(@BranchId() branchId: string): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.collectionRulesService.listEmailTemplates(branchId));
  }

  @Put('email-templates/:id')
  @Idempotent()
  @RequirePermission('financial.settings.manage')
  async updateEmailTemplate(
    @Param('id') id: string,
    @BranchId() branchId: string,
    @Body() dto: UpdateEmailTemplateDto,
  ): Promise<ApiResponse<unknown>> {
    return ApiResponse.ok(await this.collectionRulesService.updateEmailTemplate(id, branchId, dto));
  }
}
