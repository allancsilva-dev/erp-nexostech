import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { RolesRepository } from './roles.repository';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { EventBusService } from '../../infrastructure/events/event-bus.service';
import { TenantContextService } from '../../infrastructure/database/tenant-context.service';
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
  ) {}

  async list() {
    return this.rolesRepository.list();
  }

  async create(dto: CreateRoleDto) {
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
