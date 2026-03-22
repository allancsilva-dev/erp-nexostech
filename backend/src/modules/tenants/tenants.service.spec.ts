import { TenantsService } from './tenants.service';
import { TenantsRepository } from './tenants.repository';

describe('TenantsService', () => {
  it('lists tenants from repository', async () => {
    const listMock = jest.fn().mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Tenant Alpha',
        slug: 'tenant-alpha',
        schema: 'tenant_11111111_1111_4111_8111_111111111111',
        active: true,
        createdAt: '2026-03-15T00:00:00.000Z',
      },
    ]);
    const repository: jest.Mocked<TenantsRepository> = {
      list: listMock,
      create: jest.fn(),
    } as unknown as jest.Mocked<TenantsRepository>;

    const service = new TenantsService(repository);
    const result = await service.list();

    expect(result).toHaveLength(1);
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it('delegates onboarding to repository', async () => {
    const createMock = jest.fn().mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Tenant Beta',
      slug: 'tenant-beta',
      schema: 'tenant_22222222_2222_4222_8222_222222222222',
      active: true,
      createdAt: '2026-03-15T00:00:00.000Z',
    });
    const repository: jest.Mocked<TenantsRepository> = {
      list: jest.fn(),
      create: createMock,
    } as unknown as jest.Mocked<TenantsRepository>;

    const service = new TenantsService(repository);
    const dto = { name: 'Tenant Beta' };
    const result = await service.onboard(dto);

    expect(createMock).toHaveBeenCalledWith(dto);
    expect(result.slug).toBe('tenant-beta');
  });
});
