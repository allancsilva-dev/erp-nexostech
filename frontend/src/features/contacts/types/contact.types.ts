export interface Contact {
  id: string;
  name: string;
  type: 'FORNECEDOR' | 'CLIENTE' | 'AMBOS';
  document: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
}
