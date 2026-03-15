import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { PaginationDto } from '../../../common/dtos/pagination.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { ContactsService } from '../../../modules/contacts/contacts.service';
import { CreateContactDto } from '../../../modules/contacts/dto/create-contact.dto';
import { ContactResponse } from '../../../modules/contacts/dto/contact.response';
import { UpdateContactDto } from '../../../modules/contacts/dto/update-contact.dto';

@Controller('contacts')
@UseGuards(JwtGuard, RbacGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @RequirePermission('financial.entries.view')
  async list(@Query() query: PaginationDto): Promise<ApiResponse<ContactResponse[]>> {
    const { items, total } = await this.contactsService.list(query.page, query.pageSize);
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

  @Post()
  @RequirePermission('financial.entries.create')
  async create(@Body() dto: CreateContactDto): Promise<ApiResponse<ContactResponse>> {
    const created = await this.contactsService.create(dto);
    return ApiResponse.created(ContactResponse.from(created));
  }

  @Put(':id')
  @Idempotent()
  @RequirePermission('financial.entries.edit')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ): Promise<ApiResponse<ContactResponse>> {
    const updated = await this.contactsService.update(id, dto);
    return ApiResponse.ok(ContactResponse.from(updated));
  }
}
