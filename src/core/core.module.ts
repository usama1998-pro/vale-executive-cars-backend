import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { RequestLoggingInterceptor } from '../common/interceptors/request-logging.interceptor';
import { TransformResponseInterceptor } from '../common/interceptors/transform-response.interceptor';
import { PrismaRequestLifecycleInterceptor } from './database/prisma-request-lifecycle.interceptor';
import { PrismaModule } from './database/prisma.module';
import { HealthController } from './health/health.controller';
import { LoggerModule } from './logger/logger.module';
import { RootController } from './root.controller';

@Global()
@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [RootController, HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PrismaRequestLifecycleInterceptor,
    },
  ],
  exports: [PrismaModule, LoggerModule],
})
export class CoreModule {}
