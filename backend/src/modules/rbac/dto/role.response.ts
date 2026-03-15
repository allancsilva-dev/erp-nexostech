export type RoleEntity = {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
};

export class RoleResponse {
  id!: string;
  name!: string;
  description!: string;
  isSystem!: boolean;
  permissions!: string[];

  static from(entity: RoleEntity): RoleResponse {
    return Object.assign(new RoleResponse(), entity);
  }
}
