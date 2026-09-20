export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AiProvider {
  generateUmlProposal(prompt: string): Promise<unknown>;
}
