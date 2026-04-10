import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtGuard } from './common/guards/jwt.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { AuditLogListener } from './common/listeners/audit-log.listener';
import { CacheInvalidationListener } from './common/listeners/cache-invalidation.listener';
import { NotificationListener } from './common/listeners/notification.listener';
import { RbacCacheInvalidationListener } from './common/listeners/rbac-cache-invalidation.listener';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { RequestIdMiddleware } from './common/middlewares/request-id.middleware';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { V1Module } from './api/v1/v1.module';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    InfrastructureModule,
    V1Module,
  ],
  providers: [
    AuditLogListener,
    CacheInvalidationListener,
    NotificationListener,
    RbacCacheInvalidationListener,
    // Ordem dos APP_GUARDs e obrigatoria:
    // 1. JwtGuard - popula request.user (sub, tenantId, roles)
    // 2. TenantGuard - resolve tenantSchema e seta no CLS
    // 3. ThrottlerGuard - rate limiting (precisa de tenantId pra chave)
    // Guards de controller (BranchGuard, RbacGuard) rodam DEPOIS destes
    // e ja encontram tenantSchema disponivel no CLS.
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
