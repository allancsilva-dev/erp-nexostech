import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../infrastructure/database/sql-builder.util';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleEntity } from './dto/role.response';
import { UpdateRoleDto } from './dto/update-role.dto';

export type CurrentUserRoleRow = {
  roleId: string;
  roleName: string;
  isSystem: boolean;
  permissionCode: string | null;
};

export type CurrentUserBranchRow = {
  branchId: string;
  branchName: string;
};

@Injectable()
export class RolesRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(): Promise<RoleEntity[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const rows = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, name, description, is_system
      FROM ${schema}.roles
      WHERE deleted_at IS NULL
      ORDER BY name ASC
    `),
    );

    const items = rows.rows as Array<Record<string, unknown>>;
    const roleIds = items.map((row) => String(row.id));
    const permissionsByRole = await this.getPermissionsMap(roleIds);

    return items.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      description: row.description ? String(row.description) : '',
      isSystem: Boolean(row.is_system),
      permissions: permissionsByRole.get(String(row.id)) ?? [],
    }));
  }

  async create(dto: CreateRoleDto): Promise<RoleEntity> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const name = quoteLiteral(dto.name);
    const description = quoteLiteral(dto.description);

    const inserted = await this.drizzleService.getClient().execute(
      sql.raw(`
      INSERT INTO ${schema}.roles (name, description, is_system)
      VALUES (${name}, ${description}, false)
      RETURNING id, name, description, is_system
    `),
    );

    const row = inserted.rows[0] as Record<string, unknown>;
    const roleId = String(row.id);
    await this.replacePermissions(roleId, dto.permissionCodes);

    return {
      id: roleId,
      name: String(row.name),
      description: row.description ? String(row.description) : '',
      isSystem: Boolean(row.is_system),
      permissions: dto.permissionCodes,
    };
  }

  async findById(id: string): Promise<RoleEntity | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, name, description, is_system
      FROM ${schema}.roles
      WHERE id = ${idLiteral}
        AND deleted_at IS NULL
      LIMIT 1
    `),
    );

    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }

    const permissionsMap = await this.getPermissionsMap([id]);
    return {
      id,
      name: String(row.name),
      description: row.description ? String(row.description) : '',
      isSystem: Boolean(row.is_system),
      permissions: permissionsMap.get(id) ?? [],
    };
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleEntity> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const sets: string[] = [];

    if (dto.name !== undefined) sets.push(`name = ${quoteLiteral(dto.name)}`);
    if (dto.description !== undefined)
      sets.push(`description = ${quoteLiteral(dto.description)}`);

    if (sets.length > 0) {
      await this.drizzleService.getClient().execute(
        sql.raw(`
        UPDATE ${schema}.roles
        SET ${sets.join(', ')}
        WHERE id = ${idLiteral}
          AND deleted_at IS NULL
      `),
      );
    }

    if (dto.permissionCodes !== undefined) {
      await this.replacePermissions(id, dto.permissionCodes);
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Updated role could not be reloaded');
    }

    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);

    await this.drizzleService.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.roles
      SET deleted_at = NOW()
      WHERE id = ${idLiteral}
        AND deleted_at IS NULL
    `),
    );
  }

  async unlinkRoleFromUser(userId: string, roleId: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const userLiteral = quoteLiteral(userId);
    const roleLiteral = quoteLiteral(roleId);

    await this.drizzleService.getClient().execute(
      sql.raw(`
      DELETE FROM ${schema}.user_roles
      WHERE user_id = ${userLiteral}
        AND role_id = ${roleLiteral}
    `),
    );
  }

  async listUserRoles(
    userId: string,
  ): Promise<Array<{ roleId: string; roleName: string }>> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT r.id AS role_id, r.name AS role_name
      FROM ${schema}.user_roles ur
      JOIN ${schema}.roles r ON r.id = ur.role_id
      WHERE ur.user_id = ${quoteLiteral(userId)}
        AND r.deleted_at IS NULL
      ORDER BY r.name ASC
    `),
    );

    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
      roleId: String(row.role_id),
      roleName: String(row.role_name),
    }));
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    await this.drizzleService.getClient().execute(
      sql.raw(`
      INSERT INTO ${schema}.user_roles (user_id, role_id)
      VALUES (${quoteLiteral(userId)}, ${quoteLiteral(roleId)})
      ON CONFLICT (user_id, role_id) DO NOTHING
    `),
    );
  }

  async listUserPermissions(userId: string): Promise<string[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT DISTINCT rp.permission_code
      FROM ${schema}.user_roles ur
      JOIN ${schema}.role_permissions rp ON rp.role_id = ur.role_id
      WHERE ur.user_id = ${quoteLiteral(userId)}
      ORDER BY rp.permission_code ASC
    `),
    );

    return (result.rows as Array<Record<string, unknown>>).map((row) =>
      String(row.permission_code),
    );
  }

  async listCurrentUserRolesAndPermissions(
    userId: string,
  ): Promise<CurrentUserRoleRow[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT DISTINCT
        ur.role_id,
        r.name AS role_name,
        r.is_system,
        rp.permission_code
      FROM ${schema}.user_roles ur
      JOIN ${schema}.roles r
        ON r.id = ur.role_id
       AND r.deleted_at IS NULL
      LEFT JOIN ${schema}.role_permissions rp
        ON rp.role_id = ur.role_id
      WHERE ur.user_id = ${quoteLiteral(userId)}
      ORDER BY r.name ASC, rp.permission_code ASC
    `),
    );

    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
      roleId: String(row.role_id),
      roleName: String(row.role_name),
      isSystem: Boolean(row.is_system),
      permissionCode: row.permission_code ? String(row.permission_code) : null,
    }));
  }

  async listCurrentUserBranches(userId: string): Promise<CurrentUserBranchRow[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT ub.branch_id, b.name AS branch_name
      FROM ${schema}.user_branches ub
      JOIN ${schema}.branches b
        ON b.id = ub.branch_id
       AND b.active = true
       AND b.deleted_at IS NULL
      WHERE ub.user_id = ${quoteLiteral(userId)}
      ORDER BY b.name ASC
    `),
    );

    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
      branchId: String(row.branch_id),
      branchName: String(row.branch_name),
    }));
  }

  async listUserIdsByRole(roleId: string): Promise<string[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT user_id
      FROM ${schema}.user_roles
      WHERE role_id = ${quoteLiteral(roleId)}
    `),
    );

    return (result.rows as Array<Record<string, unknown>>).map((row) =>
      String(row.user_id),
    );
  }

  private async getPermissionsMap(
    roleIds: string[],
  ): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (roleIds.length === 0) {
      return map;
    }

    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idsCsv = roleIds.map((id) => quoteLiteral(id)).join(', ');
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT role_id, permission_code
      FROM ${schema}.role_permissions
      WHERE role_id IN (${idsCsv})
    `),
    );

    (result.rows as Array<Record<string, unknown>>).forEach((row) => {
      const roleId = String(row.role_id);
      const permission = String(row.permission_code);
      const current = map.get(roleId) ?? [];
      current.push(permission);
      map.set(roleId, current);
    });

    return map;
  }

  private async replacePermissions(
    roleId: string,
    permissionCodes: string[],
  ): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const roleLiteral = quoteLiteral(roleId);
    await this.drizzleService.getClient().execute(
      sql.raw(`
      DELETE FROM ${schema}.role_permissions
      WHERE role_id = ${roleLiteral}
    `),
    );

    if (permissionCodes.length === 0) {
      return;
    }

    const values = permissionCodes
      .map((permission) => `(${roleLiteral}, ${quoteLiteral(permission)})`)
      .join(', ');

    await this.drizzleService.getClient().execute(
      sql.raw(`
      INSERT INTO ${schema}.role_permissions (role_id, permission_code)
      VALUES ${values}
    `),
    );
  }
}
