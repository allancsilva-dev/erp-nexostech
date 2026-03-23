type EntryEntity = {
  id: string;
  documentNumber: string;
  type: string;
  description: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  status: string;
  categoryName: string;
  contactName: string | null;
  paidAmount: string | null;
  remainingBalance: string;
  installmentNumber: number | null;
  installmentTotal: number | null;
  hasBoleto?: boolean;
  createdAt: string;
};

export class EntryResponse {
  id!: string;
  documentNumber!: string;
  type!: string;
  description!: string;
  amount!: string;
  issueDate!: string;
  dueDate!: string;
  status!: string;
  categoryName!: string;
  contactName!: string | null;
  paidAmount!: string | null;
  remainingBalance!: string;
  hasBoleto!: boolean;
  installmentLabel!: string | null;
  createdAt!: string;

  static from(entity: EntryEntity): EntryResponse {
    const response = new EntryResponse();
    response.id = entity.id;
    response.documentNumber = entity.documentNumber;
    response.type = entity.type;
    response.description = entity.description;
    response.amount = entity.amount;
    response.issueDate = entity.issueDate;
    response.dueDate = entity.dueDate;
    response.status = entity.status;
    response.categoryName = entity.categoryName;
    response.contactName = entity.contactName;
    response.paidAmount = entity.paidAmount;
    response.remainingBalance = entity.remainingBalance;
    response.hasBoleto = entity.hasBoleto ?? false;
    response.installmentLabel =
      entity.installmentNumber && entity.installmentTotal
        ? `${entity.installmentNumber}/${entity.installmentTotal}`
        : null;
    response.createdAt = entity.createdAt;
    return response;
  }
}
