import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { UmlModule } from '../uml/uml.module';
import { AiController } from './ai.controller';
import { AI_PROVIDER } from './ai-provider';
import { AiService } from './ai.service';
import { AiUmlProposalService } from './ai-uml-proposal.service';
import { MockAiProvider } from './mock-ai.provider';
import { UnavailableAiProvider } from './unavailable-ai.provider';

@Module({
  imports: [AuthModule, UmlModule],
  controllers: [AiController],
  providers: [
    AiService, AiUmlProposalService, MockAiProvider,
    { provide: AI_PROVIDER, inject: [ConfigService, MockAiProvider], useFactory: (config: ConfigService, mock: MockAiProvider) => config.get<string>('AI_PROVIDER', 'mock') === 'mock' ? mock : new UnavailableAiProvider(config.get<string>('AI_PROVIDER', 'unknown')) },
  ],
  exports: [AiService, AiUmlProposalService],
})
export class AiModule {}
