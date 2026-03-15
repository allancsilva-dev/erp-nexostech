import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { EntriesService } from '../../../modules/financial/entries/entries.service';
import { CreateEntryDto } from '../../../modules/financial/entries/dto/create-entry.dto';
import { EntryResponse } from '../../../modules/financial/entries/dto/entry.response';
import { UpdateEntryDto } from '../../../modules/financial/entries/dto/update-entry.dto';

@Controller('entries')
@UseGuards(JwtGuard)
@UseInterceptors(TenantInterceptor)
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Get()
  @RequirePermission('financial.entries.view')
  async list(@BranchId() branchId: string): Promise<ApiResponse<EntryResponse[]>> {
    const entries = await this.entriesService.list(branchId);
    return ApiResponse.ok(entries.map((entry) => EntryResponse.from(entry)));
  }

  @Get(':entryId')
  @RequirePermission('financial.entries.view')
  async detail(
    @Param('entryId') entryId: string,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<EntryResponse>> {
    const entry = await this.entriesService.getById(entryId, branchId);
    return ApiResponse.ok(EntryResponse.from(entry));
  }

  @Post()
  @Idempotent()
  @RequirePermission('financial.entries.create')
  async create(
    @Body() dto: CreateEntryDto,
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<EntryResponse>> {
    const entry = await this.entriesService.create(dto, user, branchId);
    return ApiResponse.created(EntryResponse.from(entry));
  }

  @Put(':entryId')
  @Idempotent()
  @RequirePermission('financial.entries.edit')
  async update(
    @Param('entryId') entryId: string,
    @Body() dto: UpdateEntryDto,
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<EntryResponse>> {
    const updated = await this.entriesService.update(entryId, dto, user, branchId);
    return ApiResponse.ok(EntryResponse.from(updated));
  }

  @Delete(':entryId')
  @Idempotent()
  @RequirePermission('financial.entries.cancel')
  async remove(
    @Param('entryId') entryId: string,
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.entriesService.softDelete(entryId, user, branchId);
    return ApiResponse.ok({ deleted: true });
  }
}
