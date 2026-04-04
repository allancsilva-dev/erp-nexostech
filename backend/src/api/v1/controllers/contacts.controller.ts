import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { PaginationDto } from '../../../common/dtos/pagination.dto';
import { ListContactsDto } from '../../../modules/contacts/dto/list-contacts.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { ContactsService } from '../../../modules/contacts/contacts.service';
import { CreateContactDto } from '../../../modules/contacts/dto/create-contact.dto';
import { ContactResponse } from '../../../modules/contacts/dto/contact.response';
import { UpdateContactDto } from '../../../modules/contacts/dto/update-contact.dto';
import type { AuthUser } from '../../../common/types/auth-user.type';

@Controller('contacts')
@UseGuards(JwtGuard, RbacGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @RequirePermission('financial.entries.view')
  async list(
    @Query() query: ListContactsDto,
  ): Promise<ApiResponse<ContactResponse[]>> {
    const { items, total } = await this.contactsService.list(
      query.page,
      query.pageSize,
      query.type,
      query.search,
    );
    return ApiResponse.paginated(
      items.map((item) => ContactResponse.from(item)),
      {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    );
  }

  @Get(':id')
  @RequirePermission('financial.entries.view')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<ContactResponse>> {
    const contact = await this.contactsService.findById(id);
    return ApiResponse.ok(ContactResponse.from(contact));
  }

  @Post()
  @RequirePermission('financial.entries.create')
  async create(
    @Body() dto: CreateContactDto,
  ): Promise<ApiResponse<ContactResponse>> {
    const created = await this.contactsService.create(dto);
    return ApiResponse.created(ContactResponse.from(created));
  }

  @Put(':id')
  @Idempotent()
  @RequirePermission('financial.entries.edit')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ): Promise<ApiResponse<ContactResponse>> {
    const updated = await this.contactsService.update(id, dto);
    return ApiResponse.ok(ContactResponse.from(updated));
  }

  @Delete(':id')
  @RequirePermission('financial.entries.edit')
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.contactsService.softDelete(id, user.sub);
    return ApiResponse.ok({ deleted: true });
  }
}
