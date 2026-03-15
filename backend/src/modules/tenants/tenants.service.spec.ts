import { TenantsService } from './tenants.service';
import { TenantsRepository } from './tenants.repository';

describe('TenantsService', () => {
  it('lists tenants from repository', async () => {
    const repository: jest.Mocked<TenantsRepository> = {
      list: jest.fn().mockResolvedValue([
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Tenant Alpha',
          slug: 'tenant-alpha',
          schema: 'tenant_11111111_1111_4111_8111_111111111111',
          active: true,
          createdAt: '2026-03-15T00:00:00.000Z',
        },
      ]),
      create: jest.fn(),
    } as unknown as jest.Mocked<TenantsRepository>;

    const service = new TenantsService(repository);
    const result = await service.list();

    expect(result).toHaveLength(1);
    expect(repository.list).toHaveBeenCalledTimes(1);
  });

  it('delegates onboarding to repository', async () => {
    const repository: jest.Mocked<TenantsRepository> = {
      list: jest.fn(),
      create: jest.fn().mockResolvedValue({
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Tenant Beta',
        slug: 'tenant-beta',
        schema: 'tenant_22222222_2222_4222_8222_222222222222',
        active: true,
        createdAt: '2026-03-15T00:00:00.000Z',
      }),
    } as unknown as jest.Mocked<TenantsRepository>;

    const service = new TenantsService(repository);
    const dto = { name: 'Tenant Beta' };
    const result = await service.onboard(dto);

    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(result.slug).toBe('tenant-beta');
  });
});
