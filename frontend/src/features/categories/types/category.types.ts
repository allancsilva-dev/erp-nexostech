export interface Category {
  id: string;
  name: string;
  type: 'RECEITA' | 'DESPESA';
  parentId: string | null;
  color: string;
  active: boolean;
  sortOrder: number;
  children?: Category[];
  entryCount?: number;
}
