import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { BranchId } from '../../../common/decorators/branch-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { BranchGuard } from '../../../common/guards/branch.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { PresignDto } from './dto/presign.dto';
import { RegisterAttachmentDto } from './dto/register-attachment.dto';
import { AttachmentsService } from './attachments.service';

@Controller('attachments')
@UseGuards(JwtGuard, BranchGuard, RbacGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('presign')
  @RequirePermission('financial.entries.create')
  async presign(
    @Body() dto: PresignDto,
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<{ uploadUrl: string; storageKey: string }>> {
    const data = await this.attachmentsService.generatePresignedUrl(
      dto,
      user.tenantId,
      branchId,
      user.plan,
    );

    return ApiResponse.ok(data);
  }

  @Post()
  @Idempotent()
  @RequirePermission('financial.entries.create')
  async register(
    @Body() dto: RegisterAttachmentDto,
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<unknown>> {
    const created = await this.attachmentsService.registerAttachment(
      dto,
      user.sub,
      user.tenantId,
      branchId,
    );

    return ApiResponse.created(created);
  }

  @Delete(':id')
  @Idempotent()
  @RequirePermission('financial.entries.delete')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @BranchId() branchId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.attachmentsService.softDeleteAttachment(
      id,
      user.sub,
      user.tenantId,
      branchId,
    );

    return ApiResponse.ok({ deleted: true });
  }
}
