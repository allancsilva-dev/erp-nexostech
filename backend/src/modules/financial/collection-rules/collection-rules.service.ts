import { Injectable } from '@nestjs/common';
import { CollectionRulesRepository } from './collection-rules.repository';
import { CreateCollectionRuleDto } from './dto/create-collection-rule.dto';

@Injectable()
export class CollectionRulesService {
  constructor(private readonly collectionRulesRepository: CollectionRulesRepository) {}

  async list(branchId: string) {
    return this.collectionRulesRepository.list(branchId);
  }

  async create(branchId: string, dto: CreateCollectionRuleDto) {
    return this.collectionRulesRepository.create(branchId, dto);
  }

  async previewTemplate(templateId: string, payload: Record<string, string>) {
    return {
      templateId,
      renderedSubject: `Cobranca para ${payload.nome_cliente ?? 'Cliente'}`,
      renderedBody: `Valor ${payload.valor ?? '0.00'} vence em ${payload.vencimento ?? '-'}`,
    };
  }
}
