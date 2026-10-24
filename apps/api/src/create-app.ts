import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

export async function createApp() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.MOCK_AUTH_ENABLED === 'true'
  ) {
    throw new Error('Mock authentication cannot be enabled in production.');
  }

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({
    origin:
      process.env.CLIENT_ORIGIN?.split(',').map((origin) => origin.trim()) ??
      [],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ManaTown Digital API')
    .setDescription('Shared API for the ManaTown web and Android clients.')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup(
    'api/v1/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );
  return app;
}
