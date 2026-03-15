export type CategoryEntity = {
  id: string;
  branchId: string;
  name: string;
  type: string;
  parentId: string | null;
  color: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
};

export class CategoryResponse {
  id!: string;
  branchId!: string;
  name!: string;
  type!: string;
  parentId!: string | null;
  color!: string | null;
  active!: boolean;
  sortOrder!: number;
  createdAt!: string;

  static from(entity: CategoryEntity): CategoryResponse {
    return Object.assign(new CategoryResponse(), entity);
  }
}
