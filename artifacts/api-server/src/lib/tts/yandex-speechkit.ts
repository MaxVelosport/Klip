import { fetch as undiciFetch } from "undici";
import type { TTSParams, TTSResult, TTSProvider } from "./types.js";
import { TTSError } from "./types.js";

// Yandex voice IDs mapped from our internal voice names
const VOICE_MAP: Record<string, string> = {
  irina:  "jane",    // женский, дружелюбный
  baya:   "filipp",  // мужской
  jane:   "alena",   // женский, нейтральный
  filipp: "ermil",   // мужской, низкий
  alyss:  "jane",
  default: "jane",
};

export class YandexSpeechKitProvider implements TTSProvider {
  readonly name = "yandex-speechkit";

  async synthesize(params: TTSParams): Promise<TTSResult> {
    const apiKey  = process.env.YANDEX_API_KEY;
    const folderId = process.env.YANDEX_FOLDER_ID;
    if (!apiKey)   throw new TTSError("yandex-speechkit", "NO_API_KEY",   "YANDEX_API_KEY не задан");
    if (!folderId) throw new TTSError("yandex-speechkit", "NO_FOLDER_ID", "YANDEX_FOLDER_ID не задан");

    const voice = VOICE_MAP[params.voiceId] ?? VOICE_MAP.default;
    const speed = String(Math.min(2.0, Math.max(0.5, params.speed ?? 1.05)));

    const form = new URLSearchParams();
    form.set("text",     params.text);
    form.set("voice",    voice);
    form.set("emotion",  "good");
    form.set("speed",    speed);
    form.set("format",   "oggopus");
    form.set("folderId", folderId);
    form.set("lang",     "ru-RU");

    const res = await undiciFetch("https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize", {
      method: "POST",
      headers: {
        "Authorization":  `Api-Key ${apiKey}`,
        "Content-Type":   "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new TTSError("yandex-speechkit", `HTTP_${res.status}`, text.slice(0, 200));
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    // ~400₽ per 1M chars (Standard tier)
    const costRub = (params.text.length / 1_000_000) * 400;

    return {
      buffer,
      mimeType: "audio/ogg",
      durationSec: 0,
      costRub,
      provider: this.name,
    };
  }
}
