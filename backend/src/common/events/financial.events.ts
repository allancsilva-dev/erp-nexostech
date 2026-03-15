export class PaymentCreatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly entryId: string,
    public readonly amount: string,
  ) {}
}

export class PaymentRefundedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly entryId: string,
    public readonly amount: string,
  ) {}
}

export class TransferCreatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly transferId: string,
    public readonly amount: string,
  ) {}
}
