import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactsRepository } from './contacts.repository';

@Injectable()
export class ContactsService {
  constructor(private readonly contactsRepository: ContactsRepository) {}

  async list(page: number, pageSize: number) {
    return this.contactsRepository.list(page, pageSize);
  }

  async create(dto: CreateContactDto) {
    return this.contactsRepository.create(dto);
  }
}
