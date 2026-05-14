import type { LLMMessage, LLMOptions, LLMProvider, LLMResponse } from "./types.js";
import { LLMError } from "./types.js";

export class GigaChatProvider implements LLMProvider {
  readonly name = "gigachat";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  chat(_messages: LLMMessage[], _options?: LLMOptions): Promise<LLMResponse> {
    throw new LLMError(
      "gigachat",
      "NOT_IMPLEMENTED",
      "GigaChat не подключён, используйте LLM_PROVIDER=deepseek",
    );
  }
}
