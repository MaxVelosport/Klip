import { ProxyAgent, fetch as undiciFetch } from "undici";
import type { LLMMessage, LLMOptions, LLMProvider, LLMResponse } from "./types.js";
import { LLMError } from "./types.js";

// Pricing: input $3/1M, output $15/1M — at ~92 RUB/USD
const INPUT_RUB_PER_TOKEN = 3 * 92 / 1_000_000;
const OUTPUT_RUB_PER_TOKEN = 15 * 92 / 1_000_000;

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
  usage?: { input_tokens: number; output_tokens: number };
}

function buildProxyFetch() {
  const proxyUrl = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  if (!proxyUrl) return null;
  const dispatcher = new ProxyAgent(proxyUrl);
  return (url: string, init?: RequestInit) =>
    undiciFetch(url, { ...init, dispatcher } as Parameters<typeof undiciFetch>[1]);
}

export class ClaudeProvider implements LLMProvider {
  readonly name = "claude";
  private proxyFetch = buildProxyFetch();

  async chat(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new LLMError("claude", "NO_API_KEY", "ANTHROPIC_API_KEY не задан");

    // Separate system message from user/assistant messages
    let systemPrompt: string | undefined;
    const chatMessages: LLMMessage[] = [];
    for (const m of messages) {
      if (m.role === "system") {
        systemPrompt = (systemPrompt ? systemPrompt + "\n" : "") + m.content;
      } else {
        chatMessages.push(m);
      }
    }
    // JSON mode via system prompt
    if (options.jsonMode) {
      const hint = "Respond only with valid JSON. Do not include markdown code blocks or any other text.";
      systemPrompt = systemPrompt ? `${systemPrompt}\n\n${hint}` : hint;
    }

    const body: Record<string, unknown> = {
      model: options.model ?? "claude-sonnet-4-6",
      max_tokens: options.maxTokens ?? 4096,
      messages: chatMessages,
    };
    if (systemPrompt) body.system = systemPrompt;
    if (options.temperature !== undefined) body.temperature = options.temperature;

    const fetcher = this.proxyFetch ?? fetch;
    const res = await fetcher("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    } as RequestInit);

    if (!res.ok) {
      const text = await (res as Response).text().catch(() => "");
      throw new LLMError("claude", `HTTP_${res.status}`, text || res.statusText);
    }

    const data = (await (res as Response).json()) as AnthropicResponse;
    const content = data.content?.find((b) => b.type === "text")?.text ?? "";
    const inputTokens = data.usage?.input_tokens ?? 0;
    const outputTokens = data.usage?.output_tokens ?? 0;
    const costRub = inputTokens * INPUT_RUB_PER_TOKEN + outputTokens * OUTPUT_RUB_PER_TOKEN;

    return { content, inputTokens, outputTokens, costRub };
  }
}
