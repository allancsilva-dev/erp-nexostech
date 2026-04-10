import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../infrastructure/database/sql-builder.util';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { RolesRepository } from './roles.repository';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleEntity } from './dto/role.response';
import { UpdateRoleDto } from './dto/update-role.dto';
import { TenantContextService } from '../../infrastructure/database/tenant-context.service';
import {
  PermissionDef,
  SYSTEM_PERMISSIONS,
} from '../../common/constants/permissions';
import { AuthApiService } from './auth-api.service';
import { CreateUserDto } from './dto/create-user.dto';
import type { AuthUser } from '../../common/types/auth-user.type';

type DrizzleTransaction = Parameters<
  Parameters<DrizzleService['transaction']>[0]
>[0];

type QueryRow = Record<string, unknown>;

function getRows(result: unknown): QueryRow[] {
  if (!result || typeof result !== 'object' || !('rows' in result)) {
    return [];
  }

  const rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as QueryRow[]) : [];
}

function toText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  return fallback;
}

function toNullableText(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  return null;
}

const VALID_PERMISSION_CODES = new Set(
  SYSTEM_PERMISSIONS.map((permission) => permission.code),
);
const RBAC_CACHE_PREFIX = 'rbac:';

@Injectable()
export class RolesService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly cacheService: CacheService,
    private readonly rolesRepository: RolesRepository,
    private readonly outboxService: OutboxService,
    private readonly tenantContextService: TenantContextService,
    private readonly authApiService: AuthApiService,
  ) {}

  private schema(): string {
    return quoteIdent(this.drizzleService.getTenantSchema());
  }

  async list(): Promise<RoleEntity[]> {
    const schema = this.schema();
    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
        SELECT r.id, r.name, r.description, r.is_system,
               COALESCE(
                 array_agg(rp.permission_code ORDER BY rp.permission_code)
                 FILTER (WHERE rp.permission_code IS NOT NULL),
                 '{}'
               ) AS permissions
        FROM ${schema}.roles r
        LEFT JOIN ${schema}.role_permissions rp ON rp.role_id = r.id
        WHERE r.deleted_at IS NULL
        GROUP BY r.id, r.name, r.description, r.is_system
        ORDER BY r.name ASC
      `),
    );

    return getRows(result).map((row) => ({
      id: toText(row.id),
      name: toText(row.name),
      description: toNullableText(row.description) ?? '',
      isSystem: Boolean(row.is_system),
      permissions: Array.isArray(row.permissions)
        ? row.permissions.map((permission) => toText(permission))
        : [],
    }));
  }

  async create(dto: CreateRoleDto): Promise<RoleEntity> {
    this.assertValidPermissionCodes(dto.permissionCodes);

    const schema = this.schema();
    const trimmedName = dto.name.trim();
    const existing: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
        SELECT id
        FROM ${schema}.roles
        WHERE LOWER(name) = LOWER(${quoteLiteral(trimmedName)})
          AND deleted_at IS NULL
        LIMIT 1
      `),
    );

    if (getRows(existing).length > 0) {
      throw new BusinessException('VALIDATION_ERROR', HttpStatus.CONFLICT, {
        field: 'name',
        message: 'Ja existe uma role com este nome',
      });
    }

    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
        INSERT INTO ${schema}.roles (name, description, is_system)
        VALUES (
          ${quoteLiteral(trimmedName)},
          ${quoteLiteral(dto.description.trim())},
          false
        )
        RETURNING id
      `),
    );

    const row = getRows(result)[0];
    if (!row) {
      throw new BusinessException('INTERNAL_ERROR', HttpStatus.BAD_REQUEST);
    }

    const roleId = toText(row.id);
    await this.replaceRolePermissions(schema, roleId, dto.permissionCodes);

    return this.findRoleWithPermissions(schema, roleId);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleEntity> {
    if (dto.permissionCodes !== undefined) {
      this.assertValidPermissionCodes(dto.permissionCodes);
    }

    const schema = this.schema();
    const existing = await this.findRoleOrFail(schema, id);

    if (existing.isSystem) {
      throw new BusinessException('ROLE_SYSTEM_LOCKED', HttpStatus.FORBIDDEN, {
        id,
      });
    }

    if (dto.name !== undefined) {
      const duplicated: unknown = await this.drizzleService.getClient().execute(
        sql.raw(`
          SELECT id
          FROM ${schema}.roles
          WHERE LOWER(name) = LOWER(${quoteLiteral(dto.name.trim())})
            AND id <> ${quoteLiteral(id)}
            AND deleted_at IS NULL
          LIMIT 1
        `),
      );

      if (getRows(duplicated).length > 0) {
        throw new BusinessException('VALIDATION_ERROR', HttpStatus.CONFLICT, {
          field: 'name',
          message: 'Ja existe uma role com este nome',
        });
      }
    }

    const sets: string[] = [];
    if (dto.name !== undefined) {
      sets.push(`name = ${quoteLiteral(dto.name.trim())}`);
    }
    if (dto.description !== undefined) {
      sets.push(`description = ${quoteLiteral(dto.description.trim())}`);
    }

    if (sets.length > 0) {
      sets.push('updated_at = NOW()');
      await this.drizzleService.getClient().execute(
        sql.raw(`
          UPDATE ${schema}.roles
          SET ${sets.join(', ')}
          WHERE id = ${quoteLiteral(id)}
            AND deleted_at IS NULL
        `),
      );
    }

    if (dto.permissionCodes !== undefined) {
      await this.replaceRolePermissions(schema, id, dto.permissionCodes);
      await this.invalidateRoleCache(schema, id);
    }

    return this.findRoleWithPermissions(schema, id);
  }

  async softDelete(id: string): Promise<void> {
    const schema = this.schema();
    const existing = await this.findRoleOrFail(schema, id);

    if (existing.isSystem) {
      throw new BusinessException('ROLE_SYSTEM_LOCKED', HttpStatus.FORBIDDEN, {
        id,
      });
    }

    await this.drizzleService.getClient().execute(
      sql.raw(`
        UPDATE ${schema}.roles
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = ${quoteLiteral(id)}
          AND deleted_at IS NULL
      `),
    );

    await this.invalidateRoleCache(schema, id);
  }

  async unlinkRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.drizzleService.transaction(async (tx) => {
      await this.rolesRepository.unlinkRoleFromUser(userId, roleId, tx);
      await this.insertUserRoleChangedEvent(tx, userId);
    });
  }

  async listUserRoles(
    userId: string,
  ): Promise<Array<{ roleId: string; roleName: string }>> {
    return this.rolesRepository.listUserRoles(userId);
  }

  async assignRoleToUser(
    userId: string,
    roleId: string,
  ): Promise<{ userId: string; roleId: string }> {
    await this.drizzleService.transaction(async (tx) => {
      await this.rolesRepository.assignRoleToUser(userId, roleId, tx);
      await this.insertUserRoleChangedEvent(tx, userId);
    });

    return { userId, roleId };
  }

  async listCurrentUserPermissions(user: AuthUser): Promise<string[]> {
    if (user.roles.includes('SUPERADMIN')) {
      return ['*'];
    }

    return this.rolesRepository.listUserPermissions(user.sub);
  }

  listSystemPermissions(): Record<string, PermissionDef[]> {
    return SYSTEM_PERMISSIONS.reduce<Record<string, PermissionDef[]>>(
      (acc, permission) => {
        if (!acc[permission.module]) {
          acc[permission.module] = [];
        }
        acc[permission.module].push(permission);
        return acc;
      },
      {},
    );
  }

  async getCurrentUserProfile(user: AuthUser): Promise<{
    user: {
      id: string;
      email: string | null;
      tenantId: string;
      roles: Array<{ id: string; name: string; isSystem: boolean }>;
      active: true;
      plan?: string | null;
    };
    permissions: string[];
    branches: Array<{ id: string; name: string }>;
  }> {
    // Early return para SUPERADMIN sem tenant — nao esta provisionado em nenhum schema.
    const isSuperAdmin = user.roles?.includes('SUPERADMIN') ?? false;
    if (isSuperAdmin && !user.tenantId) {
      return {
        user: {
          id: user.sub,
          email: user.email ?? null,
          tenantId: '',
          roles: [{ id: 'superadmin', name: 'SUPERADMIN', isSystem: true }],
          active: true,
          plan: user.plan ?? null,
        },
        permissions: ['*'],
        branches: [],
      };
    }

    const rows = await this.rolesRepository.listCurrentUserRolesAndPermissions(
      user.sub,
    );

    if (rows.length === 0) {
      throw new BusinessException('USER_NOT_PROVISIONED', HttpStatus.FORBIDDEN);
    }

    const rolesMap = new Map<
      string,
      { id: string; name: string; isSystem: boolean }
    >();
    const permissionsSet = new Set<string>();

    for (const row of rows) {
      if (!rolesMap.has(row.roleId)) {
        rolesMap.set(row.roleId, {
          id: row.roleId,
          name: row.roleName,
          isSystem: row.isSystem,
        });
      }

      if (row.permissionCode) {
        permissionsSet.add(row.permissionCode);
      }
    }

    const branchesRows = await this.rolesRepository.listCurrentUserBranches(
      user.sub,
    );

    if (user.email) {
      await this.rolesRepository.syncUserEmail(user.sub, user.email);
    }

    return {
      user: {
        id: user.sub,
        email: user.email ?? null,
        tenantId: user.tenantId,
        roles: Array.from(rolesMap.values()),
        active: true,
        plan: user.plan ?? null,
      },
      permissions: Array.from(permissionsSet.values()).sort(),
      branches: branchesRows.map((branch) => ({
        id: branch.branchId,
        name: branch.branchName,
      })),
    };
  }

  async createUser(dto: CreateUserDto): Promise<{ userId: string }> {
    const authUser = await this.authApiService.findUserByEmail(dto.email);
    if (!authUser) {
      throw new BusinessException(
        'AUTH_USER_NOT_FOUND',
        HttpStatus.UNPROCESSABLE_ENTITY,
        { email: dto.email },
      );
    }

    const alreadyLinked = await this.rolesRepository.existsUserRole(
      authUser.id,
    );
    if (alreadyLinked) {
      throw new BusinessException('USER_ALREADY_LINKED', HttpStatus.CONFLICT, {
        userId: authUser.id,
      });
    }

    await this.drizzleService.transaction(async (tx) => {
      await this.rolesRepository.createUserWithRole({
        userId: authUser.id,
        roleId: dto.roleId,
        email: authUser.email,
        tx,
      });

      if (dto.branchIds && dto.branchIds.length > 0) {
        await this.rolesRepository.replaceUserBranches(
          authUser.id,
          dto.branchIds,
          tx,
        );
      }

      await this.insertUserRoleChangedEvent(tx, authUser.id);
    });

    return { userId: authUser.id };
  }

  async listUsers(): Promise<
    Array<{
      userId: string;
      email: string;
      roles: Array<{ id: string; name: string }>;
      branches: Array<{ id: string; name: string }>;
    }>
  > {
    const rows = await this.rolesRepository.listTenantUsers();
    const userIds = Array.from(new Set(rows.map((row) => row.userId)));
    const branchesRows =
      await this.rolesRepository.listBranchesByUserIds(userIds);

    const usersMap = new Map<
      string,
      {
        userId: string;
        email: string;
        roles: Array<{ id: string; name: string }>;
        branches: Array<{ id: string; name: string }>;
      }
    >();

    for (const row of rows) {
      const current = usersMap.get(row.userId) ?? {
        userId: row.userId,
        email: row.email ?? row.userId,
        roles: [],
        branches: [],
      };

      if (!current.roles.some((role) => role.id === row.roleId)) {
        current.roles.push({ id: row.roleId, name: row.roleName });
      }

      usersMap.set(row.userId, current);
    }

    for (const branchRow of branchesRows) {
      const current = usersMap.get(branchRow.userId);
      if (!current) continue;

      if (
        !current.branches.some((branch) => branch.id === branchRow.branchId)
      ) {
        current.branches.push({
          id: branchRow.branchId,
          name: branchRow.branchName,
        });
      }
    }

    return Array.from(usersMap.values()).sort((a, b) =>
      a.email.localeCompare(b.email),
    );
  }

  async updateUserBranches(
    userId: string,
    branchIds: string[],
  ): Promise<{ updated: true }> {
    const exists = await this.rolesRepository.existsUserRole(userId);
    if (!exists) {
      throw new BusinessException('USER_NOT_FOUND', HttpStatus.NOT_FOUND, {
        userId,
      });
    }

    await this.rolesRepository.replaceUserBranches(userId, branchIds);
    return { updated: true };
  }

  async updateRolePermissions(
    roleId: string,
    permissionCodes: string[],
  ): Promise<{ updated: true }> {
    this.assertValidPermissionCodes(permissionCodes);

    const schema = this.schema();
    const existing = await this.findRoleOrFail(schema, roleId);
    if (existing.isSystem) {
      throw new BusinessException('ROLE_SYSTEM_LOCKED', HttpStatus.FORBIDDEN, {
        roleId,
      });
    }

    await this.replaceRolePermissions(schema, roleId, permissionCodes);
    await this.invalidateRoleCache(schema, roleId);

    return { updated: true };
  }

  private assertValidPermissionCodes(permissionCodes: string[]): void {
    const invalid = permissionCodes.filter(
      (code) => !VALID_PERMISSION_CODES.has(code.trim()),
    );

    if (invalid.length > 0) {
      throw new BusinessException('RBAC_FORBIDDEN', HttpStatus.BAD_REQUEST, {
        invalid,
      });
    }
  }

  private async insertUserRoleChangedEvent(
    tx: DrizzleTransaction,
    userId: string,
  ): Promise<void> {
    await this.outboxService.insert(
      tx,
      this.tenantContextService.getTenantIdOrFail(),
      'rbac.user-role.changed',
      { userId },
    );
  }

  private async findRoleOrFail(
    schema: string,
    roleId: string,
  ): Promise<{ id: string; name: string; isSystem: boolean }> {
    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
        SELECT id, name, is_system
        FROM ${schema}.roles
        WHERE id = ${quoteLiteral(roleId)}
          AND deleted_at IS NULL
        LIMIT 1
      `),
    );

    const row = getRows(result)[0];
    if (!row) {
      throw new BusinessException('ROLE_NOT_FOUND', HttpStatus.NOT_FOUND, {
        roleId,
      });
    }

    return {
      id: toText(row.id),
      name: toText(row.name),
      isSystem: Boolean(row.is_system),
    };
  }

  private async findRoleWithPermissions(
    schema: string,
    roleId: string,
  ): Promise<RoleEntity> {
    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
        SELECT r.id, r.name, r.description, r.is_system,
               COALESCE(
                 array_agg(rp.permission_code ORDER BY rp.permission_code)
                 FILTER (WHERE rp.permission_code IS NOT NULL),
                 '{}'
               ) AS permissions
        FROM ${schema}.roles r
        LEFT JOIN ${schema}.role_permissions rp ON rp.role_id = r.id
        WHERE r.id = ${quoteLiteral(roleId)}
          AND r.deleted_at IS NULL
        GROUP BY r.id, r.name, r.description, r.is_system
        LIMIT 1
      `),
    );

    const row = getRows(result)[0];
    if (!row) {
      throw new BusinessException('ROLE_NOT_FOUND', HttpStatus.NOT_FOUND, {
        roleId,
      });
    }

    return {
      id: toText(row.id),
      name: toText(row.name),
      description: toNullableText(row.description) ?? '',
      isSystem: Boolean(row.is_system),
      permissions: Array.isArray(row.permissions)
        ? row.permissions.map((permission) => toText(permission))
        : [],
    };
  }

  private async replaceRolePermissions(
    schema: string,
    roleId: string,
    permissionCodes: string[],
  ): Promise<void> {
    const normalized = Array.from(
      new Set(permissionCodes.map((code) => code.trim()).filter(Boolean)),
    );

    await this.drizzleService.transaction(async (tx) => {
      await tx.execute(
        sql.raw(`
          DELETE FROM ${schema}.role_permissions
          WHERE role_id = ${quoteLiteral(roleId)}
        `),
      );

      if (normalized.length === 0) {
        return;
      }

      const values = normalized
        .map((code) => `(${quoteLiteral(roleId)}::uuid, ${quoteLiteral(code)})`)
        .join(', ');

      await tx.execute(
        sql.raw(`
          INSERT INTO ${schema}.role_permissions (role_id, permission_code)
          VALUES ${values}
          ON CONFLICT (role_id, permission_code) DO NOTHING
        `),
      );
    });
  }

  private async invalidateRoleCache(
    schema: string,
    roleId: string,
  ): Promise<void> {
    const tenantId = this.tenantContextService.getTenantIdOrFail();
    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
        SELECT user_id
        FROM ${schema}.user_roles
        WHERE role_id = ${quoteLiteral(roleId)}
      `),
    );

    for (const row of getRows(result)) {
      const userId = toText(row.user_id);
      if (userId) {
        await this.cacheService.del(
          `${RBAC_CACHE_PREFIX}${tenantId}:${userId}`,
        );
      }
    }
  }
}
