export type BankAccountEntity = {
  id: string;
  branchId: string;
  name: string;
  bankCode: string | null;
  agency: string | null;
  accountNumber: string | null;
  type: string;
  initialBalance: string;
  active: boolean;
  createdAt: string;
};

export class BankAccountResponse {
  id!: string;
  branchId!: string;
  name!: string;
  bankCode!: string | null;
  agency!: string | null;
  accountNumber!: string | null;
  type!: string;
  initialBalance!: string;
  active!: boolean;
  createdAt!: string;

  static from(entity: BankAccountEntity): BankAccountResponse {
    return Object.assign(new BankAccountResponse(), entity);
  }
}
