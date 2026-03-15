import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactEntity } from './dto/contact.response';

@Injectable()
export class ContactsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(_page: number, _pageSize: number): Promise<{ items: ContactEntity[]; total: number }> {
    this.drizzleService.getTenantDb();
    return { items: [], total: 0 };
  }

  async create(dto: CreateContactDto): Promise<ContactEntity> {
    this.drizzleService.getTenantDb();
    return {
      id: randomUUID(),
      name: dto.name,
      type: dto.type,
      document: dto.document ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      active: true,
      createdAt: new Date().toISOString(),
    };
  }
}
