import {
  Controller,
  Get,
  UseGuards,
  Query,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { resolveTenantSchema } from '../../../modules/financial/jobs/jobs.util';

@Controller('notifications')
@UseGuards(JwtGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const schema = resolveTenantSchema({ tenantId: user.tenantId });
    const pageNum = Math.max(1, Number.isFinite(Number(page)) ? Number(page) : 1);
    const limitNum = Math.min(100, Math.max(1, Number.isFinite(Number(limit)) ? Number(limit) : 20));
    const unread = unreadOnly === '1' || unreadOnly === 'true';

    const result = await this.notificationsService.findForUser(schema, user.sub, {
      page: pageNum,
      limit: limitNum,
      unreadOnly: unread,
    });

    return ApiResponse.ok(result);
  }

  @Get('count')
  async count(@CurrentUser() user: AuthUser) {
    const schema = resolveTenantSchema({ tenantId: user.tenantId });
    const count = await this.notificationsService.countUnread(schema, user.sub);
    return ApiResponse.ok({ unread: count });
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: AuthUser) {
    const schema = resolveTenantSchema({ tenantId: user.tenantId });
    await this.notificationsService.markAllAsRead(schema, user.sub);
    return ApiResponse.ok({});
  }

  @Patch(':id/read')
  async markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const schema = resolveTenantSchema({ tenantId: user.tenantId });
    await this.notificationsService.markAsRead(schema, user.sub, id);
    return ApiResponse.ok({});
  }

  @Delete(':id')
  async softDelete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const schema = resolveTenantSchema({ tenantId: user.tenantId });
    await this.notificationsService.softDelete(schema, user.sub, id);
    return ApiResponse.ok({ success: true });
  }
}
