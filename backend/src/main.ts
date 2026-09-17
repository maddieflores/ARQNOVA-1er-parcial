import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { SocketAdapter } from './config/socket.adapter';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const origin = config.getOrThrow<string>('CORS_ORIGIN');
  app.setGlobalPrefix('api');
  app.enableCors({ origin });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useWebSocketAdapter(new SocketAdapter(app, origin));
  app.enableShutdownHooks();
  await app.listen(config.getOrThrow<number>('PORT'));
}
bootstrap().catch(error => { new Logger('Bootstrap').error(error); process.exitCode = 1; });
