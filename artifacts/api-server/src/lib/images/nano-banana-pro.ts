import { ProxyAgent, fetch as undiciFetch } from "undici";
import type { ImageGenerationParams, ImageGenerationResult, ImageProvider } from "./types.js";
import { ImageError } from "./types.js";

// Premium tier — requires Google Cloud billing (~0.04$ / image → ~3.7₽)
const COST_RUB = 3.7;

interface ImagenResponse {
  predictions?: Array<{ bytesBase64Encoded: string; mimeType?: string }>;
  error?: { message: string; code?: number };
}

function buildProxyFetch() {
  const proxyUrl = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  if (!proxyUrl) return null;
  const dispatcher = new ProxyAgent(proxyUrl);
  return (url: string, init?: RequestInit) =>
    undiciFetch(url, { ...init, dispatcher } as Parameters<typeof undiciFetch>[1]);
}

export class NanoBananaProProvider implements ImageProvider {
  readonly name = "nano-banana-pro";
  private proxyFetch = buildProxyFetch();

  async generate(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new ImageError("nano-banana-pro", "NO_API_KEY", "GOOGLE_AI_API_KEY не задан");

    const aspectRatio = params.aspectRatio ?? "16:9";
    const fetcher = this.proxyFetch ?? fetch;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict`;
    const res = await fetcher(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        instances: [{ prompt: params.prompt }],
        parameters: { sampleCount: 1, aspectRatio, safetySetting: "block_most" },
      }),
    } as RequestInit);

    const data = (await (res as Response).json()) as ImagenResponse;
    if (res.status === 429 || res.status === 403) {
      throw new ImageError(
        "nano-banana-pro",
        "BILLING_REQUIRED",
        "Premium провайдер требует настроенного billing на Google Cloud",
      );
    }
    if (!res.ok || data.error) {
      throw new ImageError("nano-banana-pro", `HTTP_${res.status}`, data.error?.message ?? String(res.status));
    }

    const prediction = data.predictions?.[0];
    if (!prediction?.bytesBase64Encoded) {
      throw new ImageError("nano-banana-pro", "NO_IMAGE", "Нет изображения в ответе");
    }

    return {
      buffer: Buffer.from(prediction.bytesBase64Encoded, "base64"),
      mimeType: prediction.mimeType ?? "image/png",
      costRub: COST_RUB,
      provider: this.name,
    };
  }
}
