export interface Category {
  id: string;
  name: string;
  type: 'PAYABLE' | 'RECEIVABLE';
  parentId: string | null;
  color: string;
  active: boolean;
  sortOrder: number;
  children?: Category[];
  entryCount?: number;
}
