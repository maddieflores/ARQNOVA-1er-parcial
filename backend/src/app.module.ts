import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/validate-env';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './common/health.controller';
import { CollaborationGateway } from './collaboration/collaboration.gateway';
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), PrismaModule], controllers: [HealthController], providers: [CollaborationGateway] })
export class AppModule {}
