import { CollectionRulesService } from './collection-rules.service';
import { CollectionRulesRepository } from './collection-rules.repository';

describe('CollectionRulesService', () => {
  it('renders preview with persisted template placeholders', async () => {
    const repository: jest.Mocked<CollectionRulesRepository> = {
      findEmailTemplateById: jest.fn().mockResolvedValue({
        id: 'tpl-1',
        branchId: 'branch-1',
        name: 'Cobranca',
        subject: 'Cobranca para {{nome_cliente}}',
        bodyHtml: '<p>Valor {{valor}} vence em {{vencimento}}</p>',
        bodyText: 'Valor {{valor}} vence em {{vencimento}}',
        type: 'AFTER_DUE',
        createdAt: '2026-03-14T00:00:00.000Z',
        updatedAt: '2026-03-14T00:00:00.000Z',
      }),
    } as unknown as jest.Mocked<CollectionRulesRepository>;

    const service = new CollectionRulesService(repository);

    const preview = await service.previewTemplate('tpl-1', 'branch-1', {
      nome_cliente: 'ACME LTDA',
      valor: '150.00',
      vencimento: '2026-03-20',
    });

    expect(preview.renderedSubject).toBe('Cobranca para ACME LTDA');
    expect(preview.renderedBody).toBe(
      '<p>Valor 150.00 vence em 2026-03-20</p>',
    );
  });

  it('throws when template is missing for branch', async () => {
    const repository: jest.Mocked<CollectionRulesRepository> = {
      findEmailTemplateById: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<CollectionRulesRepository>;

    const service = new CollectionRulesService(repository);

    await expect(
      service.previewTemplate('missing', 'branch-1', {
        nome_cliente: 'Cliente',
      }),
    ).rejects.toMatchObject({
      response: {
        error: {
          code: 'EMAIL_TEMPLATE_NOT_FOUND',
        },
      },
    });
  });
});
