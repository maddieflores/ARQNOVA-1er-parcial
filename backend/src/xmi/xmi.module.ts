import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UmlModule } from '../uml/uml.module';
import { XmiController } from './xmi.controller';
import { XmiService } from './xmi.service';

@Module({ imports: [AuthModule, UmlModule], controllers: [XmiController], providers: [XmiService], exports: [XmiService] })
export class XmiModule {}
