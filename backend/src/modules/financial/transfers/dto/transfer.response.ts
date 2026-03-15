export type TransferEntity = {
  id: string;
  branchId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  transferDate: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
};

export class TransferResponse {
  id!: string;
  branchId!: string;
  fromAccountId!: string;
  toAccountId!: string;
  amount!: string;
  transferDate!: string;
  description!: string | null;
  createdBy!: string;
  createdAt!: string;

  static from(entity: TransferEntity): TransferResponse {
    return Object.assign(new TransferResponse(), entity);
  }
}
