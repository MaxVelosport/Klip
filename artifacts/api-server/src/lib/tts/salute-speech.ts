import { Agent, fetch as undiciFetch } from "undici";
import { randomUUID } from "node:crypto";
import { SALUTESPEECH_VOICES, TTSError, estimateDuration } from "./types.js";
import type { TTSParams, TTSResult, TTSProvider } from "./types.js";

const COST_RUB = 0; // free tier: 1M chars/mo

// Sber CA issues — same as GigaChat
const sberAgent = new Agent({ connect: { rejectUnauthorized: false } });

function sberFetch(url: string, init?: RequestInit) {
  return undiciFetch(url, { ...init, dispatcher: sberAgent } as Parameters<typeof undiciFetch>[1]);
}

interface SberToken { access_token: string; expires_at: number }

let cachedToken: SberToken | null = null;
let tokenInFlight: Promise<string> | null = null;

async function fetchFreshToken(): Promise<string> {
  const authKey = process.env.SALUTESPEECH_AUTH_KEY ?? process.env.GIGACHAT_AUTH_KEY;
  if (!authKey) throw new TTSError("salute-speech", "NO_AUTH_KEY", "SALUTESPEECH_AUTH_KEY не задан");

  const res = await sberFetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authKey}`,
      "RqUID": randomUUID(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "scope=SALUTE_SPEECH_PERS",
  } as RequestInit);

  if (!res.ok) {
    const text = await (res as Response).text().catch(() => "");
    throw new TTSError("salute-speech", `AUTH_${res.status}`, `Ошибка авторизации: ${text.slice(0, 200)}`);
  }

  const data = (await (res as Response).json()) as { access_token: string; expires_at: number };
  cachedToken = { access_token: data.access_token, expires_at: data.expires_at };
  return data.access_token;
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now() + 60_000) {
    return cachedToken.access_token;
  }
  if (!tokenInFlight) {
    tokenInFlight = fetchFreshToken().finally(() => { tokenInFlight = null; });
  }
  return tokenInFlight;
}

export class SaluteSpeechProvider implements TTSProvider {
  readonly name = "salute-speech";

  async synthesize(params: TTSParams): Promise<TTSResult> {
    const token = await getToken();
    const voice = SALUTESPEECH_VOICES[params.voiceId] ?? SALUTESPEECH_VOICES["irina"]!;
    const speed = params.speed ?? 1.0;

    // SaluteSpeech TTS endpoint
    const url = new URL("https://smartspeech.sber.ru/rest/v1/text:synthesize");
    url.searchParams.set("voice", voice);
    url.searchParams.set("format", "opus");
    if (speed !== 1.0) url.searchParams.set("speed", String(speed));

    const res = await sberFetch(url.toString(), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/text",
      },
      body: params.text,
    } as RequestInit);

    if (!res.ok) {
      const text = await (res as Response).text().catch(() => "");
      throw new TTSError("salute-speech", `SYNTH_${res.status}`, text.slice(0, 300));
    }

    const arrayBuffer = await (res as Response).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = (res as Response).headers.get("content-type") ?? "audio/ogg";

    return {
      buffer,
      mimeType: contentType.split(";")[0]!.trim(),
      durationSec: estimateDuration(params.text, speed),
      costRub: COST_RUB,
      provider: this.name,
    };
  }
}
