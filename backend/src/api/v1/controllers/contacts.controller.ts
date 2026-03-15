import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { PaginationDto } from '../../../common/dtos/pagination.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { ContactsService } from '../../../modules/contacts/contacts.service';
import { CreateContactDto } from '../../../modules/contacts/dto/create-contact.dto';
import { ContactResponse } from '../../../modules/contacts/dto/contact.response';

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
}
