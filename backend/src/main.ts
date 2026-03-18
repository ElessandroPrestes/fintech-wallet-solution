import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);

  // Prefixo global — todas as rotas ficam sob /api/*
  app.setGlobalPrefix('api');

  // Segurança — headers HTTP
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL', 'http://localhost:3001'),
    credentials: true,
  });

  // Validação e sanitização global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger / OpenAPI — rota explícita fora do globalPrefix
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Fintech Wallet API')
    .setDescription('API de carteira financeira com suporte a transferências, depósitos e estornos')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // '0.0.0.0' garante que o container aceita conexões externas (Docker)
  await app.listen(port, '0.0.0.0');
  console.log(`Servidor rodando em http://localhost:${port}/api`);
  console.log(`Documentação disponível em http://localhost:${port}/api/docs`);
}

bootstrap();
