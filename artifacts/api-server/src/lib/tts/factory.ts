import { SaluteSpeechProvider } from "./salute-speech.js";
import { SileroProvider } from "./silero.js";
import { YandexSpeechKitProvider } from "./yandex-speechkit.js";
import { ElevenLabsProvider } from "./elevenlabs.js";
import { TTSError } from "./types.js";
import type { TTSProvider, TTSParams, TTSResult } from "./types.js";

export function getTTSProvider(name?: string): TTSProvider {
  const n = name ?? process.env.TTS_PROVIDER ?? "salute-speech";
  switch (n) {
    case "salute-speech":    return new SaluteSpeechProvider();
    case "silero":           return new SileroProvider();
    case "yandex-speechkit": return new YandexSpeechKitProvider();
    case "elevenlabs":       return new ElevenLabsProvider();
    default:
      throw new TTSError("factory", "UNKNOWN_PROVIDER", `Unknown TTS provider: ${n}`);
  }
}

class FallbackTTSProvider implements TTSProvider {
  readonly name: string;
  constructor(private primary: TTSProvider, private fallback: TTSProvider) {
    this.name = `${primary.name}+${fallback.name}`;
  }

  async synthesize(params: TTSParams): Promise<TTSResult> {
    try {
      return await this.primary.synthesize(params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[tts] ${this.primary.name} failed: ${msg} — falling back to ${this.fallback.name}`);
      return this.fallback.synthesize(params);
    }
  }
}

export function getTTSWithFallback(primaryName?: string): TTSProvider {
  const primary = getTTSProvider(primaryName);
  const fallbackName = process.env.TTS_FALLBACK ?? "silero";
  if (fallbackName === primary.name) return primary;
  try {
    const fallback = getTTSProvider(fallbackName);
    return new FallbackTTSProvider(primary, fallback);
  } catch {
    return primary;
  }
}
