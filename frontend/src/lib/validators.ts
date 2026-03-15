import { z } from 'zod';
import Decimal from 'decimal.js';

export const monetaryAmount = z
  .string()
  .max(15, 'Valor muito longo')
  .regex(/^\d+\.\d{2}$/, 'Formato invalido (ex: 1500.00)')
  .refine((v) => new Decimal(v).greaterThan(0), 'Valor deve ser positivo')
  .refine((v) => new Decimal(v).lessThanOrEqualTo('999999999.99'), 'Valor maximo excedido');
