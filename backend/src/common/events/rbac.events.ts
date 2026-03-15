export class RbacUserRoleChangedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly userId: string,
  ) {}
}

export class RbacRolePermissionsChangedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly userIds: string[],
  ) {}
}
