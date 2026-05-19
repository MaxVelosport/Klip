import { fetch as undiciFetch, ProxyAgent } from "undici";
import type { TTSParams, TTSResult, TTSProvider } from "./types.js";
import { TTSError } from "./types.js";

// Russian-capable voices in ElevenLabs
function makeDispatcher(): ProxyAgent | undefined {
  const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  if (proxy) return new ProxyAgent(proxy);
  return undefined;
}

const VOICE_IDS: Record<string, string> = {
  irina:   "9BWtsMINqrJLrRacOk9x",  // Aria — женский, универсальный
  jane:    "XB0fDUnXU5powFXDhCwa",  // Charlotte — женский, молодой
  baya:    "pqHfZKP75CvOlQylNhV4",  // Bill — мужской, зрелый
  filipp:  "JBFqnCBsd6RMkjVDRZzb",  // George — мужской, глубокий
  alyss:   "9BWtsMINqrJLrRacOk9x",
  default: "9BWtsMINqrJLrRacOk9x",
};

export class ElevenLabsProvider implements TTSProvider {
  readonly name = "elevenlabs";

  async synthesize(params: TTSParams): Promise<TTSResult> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new TTSError("elevenlabs", "NO_API_KEY", "ELEVENLABS_API_KEY не задан");

    const voiceId = VOICE_IDS[params.voiceId] ?? VOICE_IDS.default;

    const body = {
      text: params.text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    };

    const dispatcher = makeDispatcher();
    const res = await undiciFetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key":   apiKey,
        "Accept":       "audio/mpeg",
      },
      body: JSON.stringify(body),
      ...(dispatcher ? { dispatcher } : {}),
    } as Parameters<typeof undiciFetch>[1]);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new TTSError("elevenlabs", `HTTP_${res.status}`, text.slice(0, 200));
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    // ~$22/100K chars × 90 ₽/$ = ~0.0198 ₽/char
    const costRub = (params.text.length / 100_000) * 22 * 90;

    return {
      buffer,
      mimeType: "audio/mpeg",
      durationSec: 0,
      costRub,
      provider: this.name,
    };
  }
}
