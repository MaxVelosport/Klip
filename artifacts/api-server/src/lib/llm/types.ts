export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LLMResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  costRub: number;
}

export interface LLMProvider {
  name: string;
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
}

export class LLMError extends Error {
  constructor(public provider: string, public code: string, message: string) {
    super(`[${provider}/${code}] ${message}`);
  }
}
