import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';

export type EntryRecord = {
  id: string;
  documentNumber: string;
  type: string;
  description: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  status: string;
  categoryName: string;
  contactName: string | null;
  paidAmount: string | null;
  remainingBalance: string;
  installmentNumber: number | null;
  installmentTotal: number | null;
  createdAt: string;
};

@Injectable()
export class EntriesRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(): Promise<EntryRecord[]> {
    // Placeholder de Fase 1: infraestrutura pronta para usar .withSchema() do tenant.
    this.drizzleService.getTenantDb();
    return [];
  }

  async create(data: Omit<EntryRecord, 'id' | 'createdAt'>): Promise<EntryRecord> {
    this.drizzleService.getTenantDb();

    return {
      ...data,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
  }
}
