import { ProxyAgent, fetch as undiciFetch } from "undici";
import type { ImageGenerationParams, ImageGenerationResult, ImageProvider } from "./types.js";
import { ImageError } from "./types.js";

// Free tier: track as 0₽ until billing is enabled
const COST_RUB = 0;

const ASPECT_MAP: Record<string, string> = {
  "16:9": "16:9",
  "9:16": "9:16",
  "1:1": "1:1",
};

interface ImagenResponse {
  predictions?: Array<{ bytesBase64Encoded: string; mimeType?: string }>;
  error?: { message: string; code?: number };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ inlineData?: { data: string; mimeType: string }; text?: string }>;
    };
  }>;
  error?: { message: string; code?: number };
}

function buildProxyFetch() {
  const proxyUrl = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  if (!proxyUrl) return null;
  const dispatcher = new ProxyAgent(proxyUrl);
  return (url: string, init?: RequestInit) =>
    undiciFetch(url, { ...init, dispatcher } as Parameters<typeof undiciFetch>[1]);
}

export class NanoBananaFlashProvider implements ImageProvider {
  readonly name = "nano-banana-flash";
  private proxyFetch = buildProxyFetch();

  async generate(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new ImageError("nano-banana-flash", "NO_API_KEY", "GOOGLE_AI_API_KEY не задан");

    const aspectRatio = ASPECT_MAP[params.aspectRatio ?? "16:9"] ?? "16:9";
    const fetcher = this.proxyFetch ?? fetch;

    // Strategy 1: Imagen 3 Fast via predict endpoint
    for (const model of ["imagen-3.0-fast-generate-001", "imagen-3.0-generate-001"]) {
      try {
        const res = await fetcher(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              instances: [{ prompt: params.prompt }],
              parameters: { sampleCount: 1, aspectRatio, safetySetting: "block_most" },
            }),
          } as RequestInit,
        );
        const data = (await (res as Response).json()) as ImagenResponse;
        if (res.ok && data.predictions?.[0]?.bytesBase64Encoded) {
          const p = data.predictions[0]!;
          return {
            buffer: Buffer.from(p.bytesBase64Encoded, "base64"),
            mimeType: p.mimeType ?? "image/png",
            costRub: COST_RUB,
            provider: this.name,
          };
        }
      } catch {
        // try next strategy
      }
    }

    // Strategy 2: Gemini 2.0 Flash with image generation modality
    for (const model of ["gemini-2.0-flash-preview-image-generation", "gemini-2.0-flash-exp-image-generation"]) {
      try {
        const res = await fetcher(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              contents: [{ parts: [{ text: params.prompt }] }],
              generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
            }),
          } as RequestInit,
        );
        const data = (await (res as Response).json()) as GeminiResponse;
        if (res.ok) {
          const inlineData = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
          if (inlineData?.data) {
            return {
              buffer: Buffer.from(inlineData.data, "base64"),
              mimeType: inlineData.mimeType ?? "image/png",
              costRub: COST_RUB,
              provider: this.name,
            };
          }
        }
      } catch {
        // try next strategy
      }
    }

    throw new ImageError(
      "nano-banana-flash",
      "BILLING_REQUIRED",
      "Google AI image generation требует billing. Добавьте карту на https://ai.google.dev или используйте Google Cloud Vertex AI.",
    );
  }
}
