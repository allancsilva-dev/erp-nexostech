import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuditLogListener } from './common/listeners/audit-log.listener';
import { CacheInvalidationListener } from './common/listeners/cache-invalidation.listener';
import { NotificationListener } from './common/listeners/notification.listener';
import { RbacCacheInvalidationListener } from './common/listeners/rbac-cache-invalidation.listener';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { RequestIdMiddleware } from './common/middlewares/request-id.middleware';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
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
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // IMPORTANTE: a ordem dos interceptors é obrigatória.
    // TenantInterceptor deve ser SEMPRE o primeiro — ele resolve o schema
    // do tenant no CLS antes de qualquer outro interceptor acessar o banco.
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
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
