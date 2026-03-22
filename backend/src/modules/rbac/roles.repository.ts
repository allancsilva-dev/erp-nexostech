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

export type TenantUserRoleRow = {
  userId: string;
  email: string | null;
  roleId: string;
  roleName: string;
};

export type TenantUserBranchRow = {
  userId: string;
  branchId: string;
  branchName: string;
};

@Injectable()
export class RolesRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private toText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }
    return '';
  }

  private toNullableText(value: unknown): string | null {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }
    return null;
  }

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

    const items = rows.rows;
    const roleIds = items.map((row) => String(row.id));
    const permissionsByRole = await this.getPermissionsMap(roleIds);

    return items.map((row) => ({
      id: this.toText(row.id),
      name: this.toText(row.name),
      description: this.toNullableText(row.description) ?? '',
      isSystem: Boolean(row.is_system),
      permissions: permissionsByRole.get(this.toText(row.id)) ?? [],
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

    const row = inserted.rows[0];
    const roleId = this.toText(row.id);
    await this.replacePermissions(roleId, dto.permissionCodes);

    return {
      id: roleId,
      name: this.toText(row.name),
      description: this.toNullableText(row.description) ?? '',
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
      name: this.toText(row.name),
      description: this.toNullableText(row.description) ?? '',
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
      await this.updateRolePermissions(id, dto.permissionCodes);
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

    return result.rows.map((row) => ({
      roleId: this.toText(row.role_id),
      roleName: this.toText(row.role_name),
    }));
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    await this.drizzleService.getClient().execute(
      sql.raw(`
      INSERT INTO ${schema}.user_roles (user_id, role_id, email)
      VALUES (${quoteLiteral(userId)}, ${quoteLiteral(roleId)}, NULL)
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

    return result.rows.map((row) => this.toText(row.permission_code));
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

    return result.rows.map((row) => ({
      roleId: this.toText(row.role_id),
      roleName: this.toText(row.role_name),
      isSystem: Boolean(row.is_system),
      permissionCode: this.toNullableText(row.permission_code),
    }));
  }

  async listCurrentUserBranches(
    userId: string,
  ): Promise<CurrentUserBranchRow[]> {
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

    return result.rows.map((row) => ({
      branchId: this.toText(row.branch_id),
      branchName: this.toText(row.branch_name),
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

    return result.rows.map((row) => this.toText(row.user_id));
  }

  async updateRolePermissions(
    roleId: string,
    permissionCodes: string[],
  ): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const roleLiteral = quoteLiteral(roleId);

    await this.drizzleService.transaction(async (tx) => {
      await tx.execute(
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

      await tx.execute(
        sql.raw(`
        INSERT INTO ${schema}.role_permissions (role_id, permission_code)
        VALUES ${values}
      `),
      );
    });
  }

  async existsUserRole(userId: string): Promise<boolean> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT 1
      FROM ${schema}.user_roles
      WHERE user_id = ${quoteLiteral(userId)}
      LIMIT 1
    `),
    );

    return result.rows.length > 0;
  }

  async createUserWithRole(params: {
    userId: string;
    roleId: string;
    email: string;
  }): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    await this.drizzleService.getClient().execute(
      sql.raw(`
      INSERT INTO ${schema}.user_roles (user_id, role_id, email)
      VALUES (
        ${quoteLiteral(params.userId)},
        ${quoteLiteral(params.roleId)},
        ${quoteLiteral(params.email)}
      )
    `),
    );
  }

  async replaceUserBranches(
    userId: string,
    branchIds: string[],
  ): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const userLiteral = quoteLiteral(userId);

    await this.drizzleService.transaction(async (tx) => {
      await tx.execute(
        sql.raw(`
        DELETE FROM ${schema}.user_branches
        WHERE user_id = ${userLiteral}
      `),
      );

      if (branchIds.length === 0) {
        return;
      }

      const values = branchIds
        .map((branchId) => `(${userLiteral}, ${quoteLiteral(branchId)})`)
        .join(', ');

      await tx.execute(
        sql.raw(`
        INSERT INTO ${schema}.user_branches (user_id, branch_id)
        VALUES ${values}
      `),
      );
    });
  }

  async listTenantUsers(): Promise<TenantUserRoleRow[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT DISTINCT
        ur.user_id,
        ur.email,
        r.id AS role_id,
        r.name AS role_name
      FROM ${schema}.user_roles ur
      JOIN ${schema}.roles r
        ON r.id = ur.role_id
       AND r.deleted_at IS NULL
      ORDER BY ur.email NULLS LAST, ur.user_id ASC, r.name ASC
    `),
    );

    return result.rows.map((row) => ({
      userId: this.toText(row.user_id),
      email: this.toNullableText(row.email),
      roleId: this.toText(row.role_id),
      roleName: this.toText(row.role_name),
    }));
  }

  async listBranchesByUserIds(
    userIds: string[],
  ): Promise<TenantUserBranchRow[]> {
    if (userIds.length === 0) {
      return [];
    }

    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idsCsv = userIds.map((id) => quoteLiteral(id)).join(', ');
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT ub.user_id, ub.branch_id, b.name AS branch_name
      FROM ${schema}.user_branches ub
      JOIN ${schema}.branches b
        ON b.id = ub.branch_id
       AND b.active = true
       AND b.deleted_at IS NULL
      WHERE ub.user_id IN (${idsCsv})
      ORDER BY b.name ASC
    `),
    );

    return result.rows.map((row) => ({
      userId: this.toText(row.user_id),
      branchId: this.toText(row.branch_id),
      branchName: this.toText(row.branch_name),
    }));
  }

  async syncUserEmail(userId: string, email: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    await this.drizzleService.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.user_roles
      SET email = ${quoteLiteral(email)}
      WHERE user_id = ${quoteLiteral(userId)}
        AND (email IS DISTINCT FROM ${quoteLiteral(email)})
    `),
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

    result.rows.forEach((row) => {
      const roleId = this.toText(row.role_id);
      const permission = this.toText(row.permission_code);
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
    await this.updateRolePermissions(roleId, permissionCodes);
  }
}
