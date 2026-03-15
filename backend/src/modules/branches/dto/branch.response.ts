export type BranchEntity = {
  id: string;
  name: string;
  legalName: string | null;
  document: string | null;
  phone: string | null;
  email: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  isHeadquarters: boolean;
  active: boolean;
};

export class BranchResponse {
  id!: string;
  name!: string;
  legalName!: string | null;
  document!: string | null;
  phone!: string | null;
  email!: string | null;
  addressCity!: string | null;
  addressState!: string | null;
  addressZip!: string | null;
  isHeadquarters!: boolean;
  active!: boolean;

  static from(entity: BranchEntity): BranchResponse {
    return Object.assign(new BranchResponse(), entity);
  }
}
