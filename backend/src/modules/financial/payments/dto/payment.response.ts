export type PaymentEntity = {
  id: string;
  entryId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string | null;
  bankAccountId: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
};

export class PaymentResponse {
  id!: string;
  entryId!: string;
  amount!: string;
  paymentDate!: string;
  paymentMethod!: string | null;
  bankAccountId!: string | null;
  notes!: string | null;
  createdBy!: string;
  createdAt!: string;

  static from(entity: PaymentEntity): PaymentResponse {
    return Object.assign(new PaymentResponse(), entity);
  }
}
