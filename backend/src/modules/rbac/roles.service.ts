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
