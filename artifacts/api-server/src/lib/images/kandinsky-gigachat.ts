import { Agent, fetch as undiciFetch } from "undici";
import { randomUUID } from "node:crypto";
import type { ImageGenerationParams, ImageGenerationResult, ImageProvider } from "./types.js";
import { ImageError } from "./types.js";

const COST_RUB = 0;

// GigaChat uses Sber Russian CA — skip TLS verification for MVP
// TODO: подложить Russian Trusted CA после питча
const sberAgent = new Agent({ connect: { rejectUnauthorized: false } });

function sberFetch(url: string, init?: RequestInit) {
  return undiciFetch(url, { ...init, dispatcher: sberAgent } as Parameters<typeof undiciFetch>[1]);
}

interface GCToken { access_token: string; expires_at: number }

let cachedToken: GCToken | null = null;
let tokenFetchInFlight: Promise<string> | null = null;

async function fetchFreshToken(): Promise<string> {
  const authKey = process.env.GIGACHAT_AUTH_KEY;
  if (!authKey) throw new ImageError("kandinsky", "NO_AUTH_KEY", "GIGACHAT_AUTH_KEY не задан");

  const res = await sberFetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authKey}`,
      "RqUID": randomUUID(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "scope=GIGACHAT_API_PERS",
  } as RequestInit);

  if (res.status === 429) {
    throw new ImageError("kandinsky", "AUTH_429", `OAuth rate limited`);
  }
  if (!res.ok) {
    const text = await (res as Response).text().catch(() => "");
    throw new ImageError("kandinsky", `AUTH_${res.status}`, `Ошибка авторизации: ${text.slice(0, 200)}`);
  }

  const data = (await (res as Response).json()) as { access_token: string; expires_at: number };
  cachedToken = { access_token: data.access_token, expires_at: data.expires_at };
  return data.access_token;
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now() + 60_000) {
    return cachedToken.access_token;
  }
  // Deduplicate concurrent token requests
  if (!tokenFetchInFlight) {
    tokenFetchInFlight = fetchFreshToken().finally(() => { tokenFetchInFlight = null; });
  }
  return tokenFetchInFlight;
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

interface GCChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  status?: number;
  message?: string;
}

const RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 20_000, 40_000];

async function chatWithRetry(token: string, body: object): Promise<string> {
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    const res = await sberFetch("https://gigachat.devices.sberbank.ru/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    } as RequestInit);

    if (res.status === 429) {
      const delay = RETRY_DELAYS_MS[attempt]!;
      console.warn(`[kandinsky] rate limited, retry ${attempt + 1}/${RETRY_DELAYS_MS.length} in ${delay}ms`);
      await sleep(delay);
      token = await getToken();
      continue;
    }

    if (!res.ok) {
      const text = await (res as Response).text().catch(() => "");
      throw new ImageError("kandinsky", `CHAT_${res.status}`, text.slice(0, 300));
    }

    const data = (await (res as Response).json()) as GCChatResponse;
    return data.choices?.[0]?.message?.content ?? "";
  }
  throw new ImageError("kandinsky", "RATE_LIMIT_EXHAUSTED", "Все 5 попыток исчерпаны (GigaChat rate limit)");
}

export class KandinskyGigaChatProvider implements ImageProvider {
  readonly name = "kandinsky-gigachat";

  async generate(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    const token = await getToken();
    const prompt = params.promptRu ?? params.prompt;

    const content = await chatWithRetry(token, {
      model: "GigaChat",
      messages: [
        { role: "system", content: "Ты помогаешь создавать изображения. Когда пользователь просит изображение, генерируй его." },
        { role: "user", content: `Нарисуй: ${prompt}` },
      ],
      function_call: "auto",
    });

    // Parse <img src="IMAGE_UUID" fuse="true"/>
    // src contains the file UUID; fuse is just a boolean flag
    const match = content.match(/<img[^>]+src="([^"]+)"/);
    if (!match) {
      throw new ImageError("kandinsky", "NO_IMAGE_ID", `GigaChat не вернул изображение. Ответ: ${content.slice(0, 200)}`);
    }
    const imageId = match[1]!;

    const freshToken = await getToken();
    const fileRes = await sberFetch(`https://gigachat.devices.sberbank.ru/api/v1/files/${imageId}/content`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${freshToken}` },
    } as RequestInit);

    if (!fileRes.ok) {
      throw new ImageError("kandinsky", `FILE_${fileRes.status}`, `Не удалось скачать изображение ${imageId}`);
    }

    const arrayBuffer = await (fileRes as Response).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = (fileRes as Response).headers.get("content-type") ?? "image/jpeg";

    return { buffer, mimeType, costRub: COST_RUB, provider: this.name };
  }
}
