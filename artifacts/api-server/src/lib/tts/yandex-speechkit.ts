import { TTSError } from "./types.js";
import type { TTSParams, TTSResult, TTSProvider } from "./types.js";

export class YandexSpeechKitProvider implements TTSProvider {
  readonly name = "yandex-speechkit";

  async synthesize(_params: TTSParams): Promise<TTSResult> {
    throw new TTSError("yandex-speechkit", "NOT_IMPLEMENTED", "YandexSpeechKit stub — not implemented");
  }
}
