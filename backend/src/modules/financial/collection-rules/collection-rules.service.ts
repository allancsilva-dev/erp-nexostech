import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { CollectionRulesRepository } from './collection-rules.repository';
import { CreateCollectionRuleDto } from './dto/create-collection-rule.dto';
import { UpdateCollectionRuleDto } from './dto/update-collection-rule.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

@Injectable()
export class CollectionRulesService {
  constructor(
    private readonly collectionRulesRepository: CollectionRulesRepository,
  ) {}

  async list(branchId: string) {
    return this.collectionRulesRepository.list(branchId);
  }

  async create(branchId: string, dto: CreateCollectionRuleDto) {
    return this.collectionRulesRepository.create(branchId, dto);
  }

  async update(id: string, branchId: string, dto: UpdateCollectionRuleDto) {
    const existing = await this.collectionRulesRepository.findById(
      id,
      branchId,
    );
    if (!existing) {
      throw new BusinessException(
        'COLLECTION_RULE_NOT_FOUND',
        'Regra de cobranca nao encontrada para a filial informada',
        { id, branchId },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.collectionRulesRepository.update(id, branchId, dto);
  }

  async softDelete(id: string, branchId: string): Promise<void> {
    const existing = await this.collectionRulesRepository.findById(
      id,
      branchId,
    );
    if (!existing) {
      throw new BusinessException(
        'COLLECTION_RULE_NOT_FOUND',
        'Regra de cobranca nao encontrada para a filial informada',
        { id, branchId },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.collectionRulesRepository.softDelete(id, branchId);
  }

  async previewTemplate(
    templateId: string,
    branchId: string,
    payload: Record<string, string>,
  ) {
    const template = await this.collectionRulesRepository.findEmailTemplateById(
      templateId,
      branchId,
    );
    if (!template) {
      throw new BusinessException(
        'EMAIL_TEMPLATE_NOT_FOUND',
        'Template de e-mail nao encontrado para a filial informada',
        { id: templateId, branchId },
        HttpStatus.NOT_FOUND,
      );
    }

    const renderedSubject = this.applyVariables(template.subject, payload);
    const renderedBody = this.applyVariables(template.bodyHtml, payload);

    return {
      templateId,
      renderedSubject,
      renderedBody,
    };
  }

  async listEmailTemplates(branchId: string) {
    return this.collectionRulesRepository.listEmailTemplates(branchId);
  }

  async updateEmailTemplate(
    id: string,
    branchId: string,
    dto: UpdateEmailTemplateDto,
  ) {
    const updated = await this.collectionRulesRepository.updateEmailTemplate(
      id,
      branchId,
      dto,
    );
    if (!updated) {
      throw new BusinessException(
        'EMAIL_TEMPLATE_NOT_FOUND',
        'Template de e-mail nao encontrado para a filial informada',
        { id, branchId },
        HttpStatus.NOT_FOUND,
      );
    }

    return updated;
  }

  private applyVariables(
    template: string,
    payload: Record<string, string>,
  ): string {
    return template.replace(
      /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
      (_match, key: string) => {
        return payload[key] ?? '';
      },
    );
  }
}
