import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import {
  shutdownOpenTelemetry,
  startOpenTelemetry,
} from './infrastructure/observability/otel.bootstrap';

async function bootstrap() {
  startOpenTelemetry();

  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  app.enableCors({
    origin: ['https://erp.zonadev.tech'],
    credentials: true,
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.setGlobalPrefix('api/v1');

  process.on('SIGTERM', () => {
    void shutdownOpenTelemetry();
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
