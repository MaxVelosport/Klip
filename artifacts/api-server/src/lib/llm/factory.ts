import { DeepSeekProvider } from "./deepseek.js";
import { ClaudeProvider } from "./claude.js";
import { GigaChatProvider } from "./gigachat.js";
import type { LLMMessage, LLMOptions, LLMProvider, LLMResponse } from "./types.js";

export function getLLMProvider(name?: string): LLMProvider {
  const provider = (name ?? process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();
  switch (provider) {
    case "deepseek": return new DeepSeekProvider();
    case "claude":
    case "anthropic": return new ClaudeProvider();
    case "gigachat":
    case "sber": return new GigaChatProvider();
    default: throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

class FallbackProvider implements LLMProvider {
  constructor(private primary: LLMProvider, private fallback: LLMProvider) {}

  get name() { return `${this.primary.name}|${this.fallback.name}`; }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    try {
      return await this.primary.chat(messages, options);
    } catch (err) {
      console.warn(`[LLM] ${this.primary.name} failed, falling back to ${this.fallback.name}:`, (err as Error).message);
      return await this.fallback.chat(messages, options);
    }
  }
}

export function getLLMWithFallback(): LLMProvider {
  const primary = getLLMProvider(process.env.LLM_PROVIDER);
  const fallbackName = process.env.LLM_FALLBACK ?? "claude";
  // Avoid creating a fallback pointing to the same provider
  if (primary.name === getLLMProvider(fallbackName).name) return primary;
  const fallback = getLLMProvider(fallbackName);
  return new FallbackProvider(primary, fallback);
}
