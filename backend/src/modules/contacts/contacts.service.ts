import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactsRepository } from './contacts.repository';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly contactsRepository: ContactsRepository) {}

  async list(page: number, pageSize: number, type?: string, search?: string) {
    return this.contactsRepository.list(page, pageSize, type, search);
  }

  async create(dto: CreateContactDto) {
    return this.contactsRepository.create(dto);
  }

  async findById(id: string) {
    const existing = await this.contactsRepository.findById(id);
    if (!existing) {
      throw new BusinessException('CONTACT_NOT_FOUND', HttpStatus.NOT_FOUND, {
        id,
      });
    }

    return existing;
  }

  async update(id: string, dto: UpdateContactDto) {
    const existing = await this.contactsRepository.findById(id);
    if (!existing) {
      throw new BusinessException('CONTACT_NOT_FOUND', HttpStatus.NOT_FOUND, {
        id,
      });
    }

    return this.contactsRepository.update(id, dto);
  }

  async softDelete(id: string, _userId: string): Promise<void> {
    const existing = await this.contactsRepository.findById(id);
    if (!existing) {
      throw new BusinessException('CONTACT_NOT_FOUND', HttpStatus.NOT_FOUND, {
        id,
      });
    }

    await this.contactsRepository.softDelete(id);
  }
}
