import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { CollectionRulesRepository } from './collection-rules.repository';
import { CreateCollectionRuleDto } from './dto/create-collection-rule.dto';
import { UpdateCollectionRuleDto } from './dto/update-collection-rule.dto';

@Injectable()
export class CollectionRulesService {
  constructor(private readonly collectionRulesRepository: CollectionRulesRepository) {}

  async list(branchId: string) {
    return this.collectionRulesRepository.list(branchId);
  }

  async create(branchId: string, dto: CreateCollectionRuleDto) {
    return this.collectionRulesRepository.create(branchId, dto);
  }

  async update(id: string, branchId: string, dto: UpdateCollectionRuleDto) {
    const existing = await this.collectionRulesRepository.findById(id, branchId);
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
    const existing = await this.collectionRulesRepository.findById(id, branchId);
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

  async previewTemplate(templateId: string, payload: Record<string, string>) {
    return {
      templateId,
      renderedSubject: `Cobranca para ${payload.nome_cliente ?? 'Cliente'}`,
      renderedBody: `Valor ${payload.valor ?? '0.00'} vence em ${payload.vencimento ?? '-'}`,
    };
  }
}
