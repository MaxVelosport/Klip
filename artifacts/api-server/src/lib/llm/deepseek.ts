import type { LLMMessage, LLMOptions, LLMProvider, LLMResponse } from "./types.js";
import { LLMError } from "./types.js";

// Pricing: input $0.27/1M, output $1.10/1M — at ~92 RUB/USD
const INPUT_RUB_PER_TOKEN = 0.27 * 92 / 1_000_000;
const OUTPUT_RUB_PER_TOKEN = 1.10 * 92 / 1_000_000;

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export class DeepSeekProvider implements LLMProvider {
  readonly name = "deepseek";

  async chat(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new LLMError("deepseek", "NO_API_KEY", "DEEPSEEK_API_KEY не задан");

    const body: Record<string, unknown> = {
      model: options.model ?? "deepseek-chat",
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    };
    if (options.jsonMode) body.response_format = { type: "json_object" };

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new LLMError("deepseek", `HTTP_${res.status}`, text || res.statusText);
    }

    const data = (await res.json()) as OpenAIResponse;
    const content = data.choices?.[0]?.message?.content ?? "";
    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;
    const costRub = inputTokens * INPUT_RUB_PER_TOKEN + outputTokens * OUTPUT_RUB_PER_TOKEN;

    return { content, inputTokens, outputTokens, costRub };
  }
}
