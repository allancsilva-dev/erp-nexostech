import { z } from 'zod';
import Decimal from 'decimal.js';

export const monetaryAmount = z
  .string()
  .max(15, 'Valor muito longo')
  .regex(/^\d+\.\d{2}$/, 'Formato invalido (ex: 1500.00)')
  .refine((v) => new Decimal(v).greaterThan(0), 'Valor deve ser positivo')
  .refine((v) => new Decimal(v).lessThanOrEqualTo('999999999.99'), 'Valor maximo excedido');

export const createEntrySchema = z
  .object({
    description: z.string().min(3, 'Mínimo 3 caracteres').max(200, 'Máximo 200 caracteres'),
    type: z.enum(['PAYABLE', 'RECEIVABLE']),
    amount: monetaryAmount,
    issueDate: z.string().min(1, 'Data de emissão é obrigatória'),
    dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
    categoryId: z.string().uuid('Categoria é obrigatória'),
    contactId: z.string().uuid('Contato inválido').optional().or(z.literal('')),
    bankAccountId: z.string().uuid('Conta bancaria invalida').optional().or(z.literal('')),
    paymentMethod: z.enum(['BOLETO', 'PIX', 'TRANSFER', 'CARD', 'CASH', 'OTHER']).optional(),
    installment: z.boolean().default(false),
    installmentCount: z.number().int().min(2).max(120).optional(),
    installmentFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY']).optional(),
    notes: z.string().max(500).optional(),
    status: z.enum(['DRAFT', 'PENDING', 'PENDING_APPROVAL']).optional().default('PENDING'),
  })
  .refine((data) => data.dueDate >= data.issueDate, {
    message: 'Vencimento deve ser maior ou igual a emissao',
    path: ['dueDate'],
  })
  .refine((data) => !data.installment || Boolean(data.installmentCount && data.installmentFrequency), {
    message: 'Parcelas e frequencia obrigatorios',
    path: ['installmentCount'],
  });

export const payEntrySchema = z.object({
  amount: monetaryAmount,
  paymentDate: z.string().min(1, 'Data obrigatoria'),
  paymentMethod: z.enum(['BOLETO', 'PIX', 'TRANSFER', 'CARD', 'CASH', 'OTHER']).optional(),
  bankAccountId: z.string().uuid('Conta bancaria invalida').optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
});

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type PayEntryInput = z.infer<typeof payEntrySchema>;
