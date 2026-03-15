import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  RbacRolePermissionsChangedEvent,
  RbacUserRoleChangedEvent,
} from '../events/rbac.events';
import { CacheService } from '../../infrastructure/cache/cache.service';

@Injectable()
export class RbacCacheInvalidationListener {
  constructor(private readonly cacheService: CacheService) {}

  @OnEvent('rbac.user-role.changed')
  async onUserRoleChanged(event: RbacUserRoleChangedEvent): Promise<void> {
    await this.cacheService.del(
      this.buildCacheKey(event.tenantId, event.userId),
    );
  }

  @OnEvent('rbac.role-permissions.changed')
  async onRolePermissionsChanged(
    event: RbacRolePermissionsChangedEvent,
  ): Promise<void> {
    await Promise.all(
      event.userIds.map((userId) =>
        this.cacheService.del(this.buildCacheKey(event.tenantId, userId)),
      ),
    );
  }

  private buildCacheKey(tenantId: string, userId: string): string {
    return `rbac:${tenantId}:${userId}`;
  }
}
