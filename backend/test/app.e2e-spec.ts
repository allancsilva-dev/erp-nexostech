import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

jest.mock('../src/common/guards/jwt.guard', () => ({
  JwtGuard: class {
    canActivate(context: {
      switchToHttp: () => { getRequest: () => Record<string, unknown> };
    }) {
      const req = context.switchToHttp().getRequest();
      req.user = {
        sub: 'user-1',
        tenantId: 'tenant-1',
        roles: ['ADMIN'],
        plan: 'PRO',
        aud: 'erp.zonadev.tech',
        email: 'admin@nexos.local',
      };
      return true;
    }
  },
}));

jest.mock('../src/common/guards/branch.guard', () => ({
  BranchGuard: class {
    canActivate() {
      return true;
    }
  },
}));

jest.mock('../src/common/guards/rbac.guard', () => ({
  RbacGuard: class {
    canActivate() {
      return true;
    }
  },
}));

import { UsersController } from '../src/api/v1/controllers/users.controller';
import { BranchesController } from '../src/api/v1/controllers/branches.controller';
import { ReconciliationController } from '../src/api/v1/controllers/reconciliation.controller';
import { TenantsController } from '../src/api/v1/controllers/tenants.controller';
import { RolesService } from '../src/modules/rbac/roles.service';
import { BranchesService } from '../src/modules/branches/branches.service';
import { ReconciliationService } from '../src/modules/financial/reconciliation/reconciliation.service';
import { TenantsService } from '../src/modules/tenants/tenants.service';

describe('V1 Contract (e2e)', () => {
  let app: INestApplication<App>;

  const rolesServiceMock = {
    listUserRoles: jest
      .fn()
      .mockResolvedValue([
        { roleId: '11111111-1111-4111-8111-111111111111', roleName: 'Admin' },
      ]),
    assignRoleToUser: jest
      .fn()
      .mockImplementation((userId: string, roleId: string) => ({
        userId,
        roleId,
      })),
  };

  const branchesServiceMock = {
    list: jest.fn().mockResolvedValue([]),
    listForUser: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    unlinkUser: jest.fn(),
    listUsers: jest
      .fn()
      .mockResolvedValue([{ userId: '22222222-2222-4222-8222-222222222222' }]),
    assignUser: jest
      .fn()
      .mockImplementation((branchId: string, userId: string) => ({
        branchId,
        userId,
      })),
  };

  const reconciliationServiceMock = {
    listPending: jest.fn().mockResolvedValue([]),
    importBatch: jest.fn(),
    getBatchItems: jest.fn().mockResolvedValue([]),
    match: jest.fn().mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      reconciled: true,
    }),
    undo: jest.fn(),
  };

  const tenantsServiceMock = {
    list: jest.fn().mockResolvedValue([]),
    onboard: jest.fn().mockImplementation((dto: { name: string }) => ({
      id: '88888888-8888-4888-8888-888888888888',
      name: dto.name,
      slug: 'tenant-gamma',
      schema: 'tenant_88888888_8888_4888_8888_888888888888',
      active: true,
      createdAt: '2026-03-15T00:00:00.000Z',
    })),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        UsersController,
        BranchesController,
        ReconciliationController,
        TenantsController,
      ],
      providers: [
        { provide: RolesService, useValue: rolesServiceMock },
        { provide: BranchesService, useValue: branchesServiceMock },
        { provide: ReconciliationService, useValue: reconciliationServiceMock },
        { provide: TenantsService, useValue: tenantsServiceMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('validates POST /users/:id/roles payload and returns ApiResponse', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users/user-1/roles')
      .send({ roleId: 'invalid' })
      .expect(400);

    const roleId = '11111111-1111-4111-8111-111111111111';
    const response = await request(app.getHttpServer())
      .post('/api/v1/users/user-1/roles')
      .send({ roleId })
      .expect(201);

    expect(response.body).toEqual({
      data: {
        userId: 'user-1',
        roleId,
      },
    });
  });

  it('validates POST /branches/:id/users payload and returns ApiResponse', async () => {
    const branchId = '22222222-2222-4222-8222-222222222222';

    await request(app.getHttpServer())
      .post(`/api/v1/branches/${branchId}/users`)
      .send({ userId: 'nope' })
      .expect(400);

    const userId = '44444444-4444-4444-8444-444444444444';
    const response = await request(app.getHttpServer())
      .post(`/api/v1/branches/${branchId}/users`)
      .send({ userId })
      .expect(201);

    expect(response.body).toEqual({
      data: {
        branchId,
        userId,
      },
    });
  });

  it('validates POST /reconciliation/match payload and uses branch header', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/reconciliation/match')
      .set('X-Branch-Id', '55555555-5555-4555-8555-555555555555')
      .send({ itemId: 'invalid' })
      .expect(400);

    const branchId = '55555555-5555-4555-8555-555555555555';
    const itemId = '66666666-6666-4666-8666-666666666666';
    const entryId = '77777777-7777-4777-8777-777777777777';
    const response = await request(app.getHttpServer())
      .post('/api/v1/reconciliation/match')
      .set('X-Branch-Id', branchId)
      .send({ itemId, entryId })
      .expect(201);

    expect(reconciliationServiceMock.match).toHaveBeenCalledWith(
      itemId,
      entryId,
      branchId,
      expect.objectContaining({ sub: 'user-1' }),
    );
    expect(response.body).toEqual({
      data: {
        id: '33333333-3333-4333-8333-333333333333',
        reconciled: true,
      },
    });
  });

  it('validates POST /tenants/onboarding payload and returns tenant data', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/tenants/onboarding')
      .send({ name: '' })
      .expect(400);

    const response = await request(app.getHttpServer())
      .post('/api/v1/tenants/onboarding')
      .send({ name: 'Tenant Gamma' })
      .expect(201);

    expect(tenantsServiceMock.onboard).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Tenant Gamma' }),
    );
    expect(response.body).toEqual({
      data: {
        id: '88888888-8888-4888-8888-888888888888',
        name: 'Tenant Gamma',
        slug: 'tenant-gamma',
        schema: 'tenant_88888888_8888_4888_8888_888888888888',
        active: true,
        createdAt: '2026-03-15T00:00:00.000Z',
      },
    });
  });
});
