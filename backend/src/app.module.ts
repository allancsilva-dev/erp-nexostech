import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { CacheInvalidationListener } from './common/listeners/cache-invalidation.listener';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
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
    CacheInvalidationListener,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
