import { Body, Controller, Get, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { EntriesService } from '../../../modules/financial/entries/entries.service';
import { CreateEntryDto } from '../../../modules/financial/entries/dto/create-entry.dto';
import { EntryResponse } from '../../../modules/financial/entries/dto/entry.response';

@Controller('entries')
@UseGuards(JwtGuard)
@UseInterceptors(TenantInterceptor)
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Get()
  @RequirePermission('financial.entries.view')
  async list(): Promise<ApiResponse<EntryResponse[]>> {
    const entries = await this.entriesService.list();
    return ApiResponse.ok(entries.map((entry) => EntryResponse.from(entry)));
  }

  @Post()
  @RequirePermission('financial.entries.create')
  async create(
    @Body() dto: CreateEntryDto,
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<EntryResponse>> {
    const entry = await this.entriesService.create(dto, user, branchId);
    return ApiResponse.created(EntryResponse.from(entry));
  }
}
