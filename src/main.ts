import './bootstrap-env';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupAdminStatic } from './core/admin/setup-admin-static';
import { createApplicationLogger } from './core/logger/nest-winston.logger';
import { AuthService } from './modules/auth/auth.service';
import { registerSwaggerAdminGuard } from './core/swagger/swagger-admin.middleware';
import { getSwaggerPath, setupSwagger } from './core/swagger/setup-swagger';

async function bootstrap() {
  const logger = createApplicationLogger();
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger,
  });
  app.useLogger(logger);
  app.enableShutdownHooks();
  app.enableCors({
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'ngrok-skip-browser-warning',
    ],
    credentials: true,
    maxAge: 86_400,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const authService = app.get(AuthService);
  registerSwaggerAdminGuard(app, authService);
  setupSwagger(app);
  setupAdminStatic(app);

  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);

  const base =
    process.env.APP_URL?.replace(/\/$/, '') ?? `http://localhost:${port}`;
  const docsPath = getSwaggerPath();
  logger.log(`Process timezone: ${process.env.TZ}`, 'Bootstrap');
  logger.log(`Listening on http://${host}:${port}`, 'Bootstrap');
  logger.log(`Admin: ${base}/admin`, 'Bootstrap');
  logger.log(`Swagger (admin only): ${base}/${docsPath}`, 'Bootstrap');
}
void bootstrap();
