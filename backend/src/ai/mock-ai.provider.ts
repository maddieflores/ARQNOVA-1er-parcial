import { Injectable } from '@nestjs/common';
import type { AiProvider } from './ai-provider';

@Injectable()
export class MockAiProvider implements AiProvider {
  async generateUmlProposal(_prompt: string) {
    return JSON.stringify({
      classes: [
        { name: 'Cliente', attributes: [{ name: 'id', type: 'Long', visibility: 'PRIVATE', isPrimaryKey: true }, { name: 'nombre', type: 'String', visibility: 'PRIVATE' }], methods: [] },
        { name: 'Pedido', attributes: [{ name: 'fecha', type: 'Date', visibility: 'PRIVATE' }, { name: 'total', type: 'Decimal', visibility: 'PRIVATE' }], methods: [] },
      ],
      relations: [{ sourceClassName: 'Cliente', targetClassName: 'Pedido', type: 'ASSOCIATION', sourceMultiplicity: '1', targetMultiplicity: '0..*', label: 'realiza' }],
    });
  }
}
