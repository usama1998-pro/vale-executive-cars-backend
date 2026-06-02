import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { buildSwaggerAdminAuthScript } from './swagger-admin-auth.script';

const SWAGGER_PATH = 'docs';

export function getSwaggerPath(): string {
  return SWAGGER_PATH;
}

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Vale Executives Cars API')
    .setDescription('HTTP API for Vale Executives Cars backend')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        bearerFormat: 'JWT',
        description:
          'Filled automatically when you open docs after signing in at /admin.',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customJsStr: buildSwaggerAdminAuthScript(),
  });
}
