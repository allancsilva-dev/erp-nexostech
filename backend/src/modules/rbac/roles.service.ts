import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { RolesRepository } from './roles.repository';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { EventBusService } from '../../infrastructure/events/event-bus.service';
import { TenantContextService } from '../../infrastructure/database/tenant-context.service';
import {
  PermissionDef,
  SYSTEM_PERMISSIONS,
} from '../../common/constants/permissions';
import { AuthApiService } from './auth-api.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
  RbacRolePermissionsChangedEvent,
  RbacUserRoleChangedEvent,
} from '../../common/events/rbac.events';
import type { AuthUser } from '../../common/types/auth-user.type';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly eventBusService: EventBusService,
    private readonly tenantContextService: TenantContextService,
    private readonly authApiService: AuthApiService,
  ) {}

  async list() {
    return this.rolesRepository.list();
  }

  async create(dto: CreateRoleDto) {
    this.assertValidPermissionCodes(dto.permissionCodes);
    return this.rolesRepository.create(dto);
  }

  async update(id: string, dto: UpdateRoleDto) {
    const existing = await this.rolesRepository.findById(id);
    if (!existing) {
      throw new BusinessException(
        'ROLE_NOT_FOUND',
        'Role nao encontrada',
        { id },
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.permissionCodes !== undefined) {
      this.assertValidPermissionCodes(dto.permissionCodes);
    }

    if (existing.isSystem) {
      throw new BusinessException(
        'ROLE_SYSTEM_LOCKED',
        'Role de sistema nao pode ser editada',
        { id },
        HttpStatus.FORBIDDEN,
      );
    }

    const updated = await this.rolesRepository.update(id, dto);

    if (dto.permissionCodes !== undefined) {
      const userIds = await this.rolesRepository.listUserIdsByRole(id);
      this.emitRolePermissionsChanged(userIds);
    }

    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.rolesRepository.findById(id);
    if (!existing) {
      throw new BusinessException(
        'ROLE_NOT_FOUND',
        'Role nao encontrada',
        { id },
        HttpStatus.NOT_FOUND,
      );
    }

    if (existing.isSystem) {
      throw new BusinessException(
        'ROLE_SYSTEM_LOCKED',
        'Role de sistema nao pode ser excluida',
        { id },
        HttpStatus.FORBIDDEN,
      );
    }

    const userIds = await this.rolesRepository.listUserIdsByRole(id);
    await this.rolesRepository.softDelete(id);
    this.emitRolePermissionsChanged(userIds);
  }

  async unlinkRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.rolesRepository.unlinkRoleFromUser(userId, roleId);
    this.emitUserRoleChanged(userId);
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
    await this.rolesRepository.assignRoleToUser(userId, roleId);
    this.emitUserRoleChanged(userId);
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
    };
    permissions: string[];
    branches: Array<{ id: string; name: string }>;
  }> {
    const rows = await this.rolesRepository.listCurrentUserRolesAndPermissions(
      user.sub,
    );

    if (rows.length === 0) {
      throw new BusinessException(
        'USER_NOT_PROVISIONED',
        'Usuario nao configurado neste tenant. Contate o administrador.',
        undefined,
        HttpStatus.FORBIDDEN,
      );
    }

    const rolesMap = new Map<string, { id: string; name: string; isSystem: boolean }>();
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
      },
      permissions: Array.from(permissionsSet.values()).sort(),
      branches: branchesRows.map((branch) => ({
        id: branch.branchId,
        name: branch.branchName,
      })),
    };
  }

  async createUser(dto: CreateUserDto, actor: AuthUser): Promise<{ userId: string }> {
    const authUser = await this.authApiService.findUserByEmail(dto.email);
    if (!authUser) {
      throw new BusinessException(
        'AUTH_USER_NOT_FOUND',
        'Usuario nao cadastrado no ZonaDev Auth. O usuario precisa ser cadastrado primeiro.',
        { email: dto.email },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const alreadyLinked = await this.rolesRepository.existsUserRole(authUser.id);
    if (alreadyLinked) {
      throw new BusinessException(
        'USER_ALREADY_LINKED',
        'Usuario ja vinculado a este tenant',
        { userId: authUser.id },
        HttpStatus.CONFLICT,
      );
    }

    await this.rolesRepository.createUserWithRole({
      userId: authUser.id,
      roleId: dto.roleId,
      email: authUser.email,
    });

    if (dto.branchIds && dto.branchIds.length > 0) {
      await this.rolesRepository.replaceUserBranches(authUser.id, dto.branchIds);
    }

    this.emitUserRoleChanged(authUser.id);

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
    const branchesRows = await this.rolesRepository.listBranchesByUserIds(userIds);

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

      if (!current.branches.some((branch) => branch.id === branchRow.branchId)) {
        current.branches.push({ id: branchRow.branchId, name: branchRow.branchName });
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
      throw new BusinessException(
        'USER_NOT_FOUND',
        'Usuario nao encontrado neste tenant',
        { userId },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.rolesRepository.replaceUserBranches(userId, branchIds);
    return { updated: true };
  }

  async updateRolePermissions(
    roleId: string,
    permissionCodes: string[],
  ): Promise<{ updated: true }> {
    this.assertValidPermissionCodes(permissionCodes);

    const existing = await this.rolesRepository.findById(roleId);
    if (!existing) {
      throw new BusinessException(
        'ROLE_NOT_FOUND',
        'Role nao encontrada',
        { roleId },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.rolesRepository.updateRolePermissions(roleId, permissionCodes);
    const userIds = await this.rolesRepository.listUserIdsByRole(roleId);
    this.emitRolePermissionsChanged(userIds);

    return { updated: true };
  }

  private assertValidPermissionCodes(permissionCodes: string[]): void {
    const validCodes = new Set(SYSTEM_PERMISSIONS.map((permission) => permission.code));
    const invalid = permissionCodes.filter((code) => !validCodes.has(code));

    if (invalid.length > 0) {
      throw new BusinessException(
        'INVALID_PERMISSIONS',
        `Permissoes invalidas: ${invalid.join(', ')}`,
        { invalid },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private emitUserRoleChanged(userId: string): void {
    this.eventBusService.emit(
      'rbac.user-role.changed',
      new RbacUserRoleChangedEvent(
        this.tenantContextService.getTenantIdOrFail(),
        userId,
      ),
    );
  }

  private emitRolePermissionsChanged(userIds: string[]): void {
    if (userIds.length === 0) {
      return;
    }

    this.eventBusService.emit(
      'rbac.role-permissions.changed',
      new RbacRolePermissionsChangedEvent(
        this.tenantContextService.getTenantIdOrFail(),
        userIds,
      ),
    );
  }
}
