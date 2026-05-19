import { fetch as undiciFetch } from "undici";
import type { ImageGenerationParams, ImageGenerationResult, ImageProvider } from "./types.js";
import { ImageError } from "./types.js";

type FalAspectRatio = "landscape_16_9" | "portrait_9_16" | "square";

function toFalAspect(ar?: string): FalAspectRatio {
  if (ar === "9:16") return "portrait_9_16";
  if (ar === "1:1")  return "square";
  return "landscape_16_9";
}

interface FalResultResponse {
  images?: Array<{ url: string; content_type?: string }>;
}

export class FluxProProvider implements ImageProvider {
  readonly name = "flux-pro";

  async generate(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) throw new ImageError("flux-pro", "NO_API_KEY", "FAL_API_KEY не задан");

    // Synchronous endpoint — no polling needed
    const res = await undiciFetch("https://fal.run/fal-ai/flux-pro/v1.1", {
      method: "POST",
      headers: {
        "Authorization": `Key ${apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        prompt:          params.prompt,
        image_size:      toFalAspect(params.aspectRatio),
        num_images:      1,
        safety_tolerance: "5",
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ImageError("flux-pro", `HTTP_${res.status}`, text.slice(0, 300));
    }

    const data = (await res.json()) as FalResultResponse;
    const imageUrl = data.images?.[0]?.url;
    if (!imageUrl) throw new ImageError("flux-pro", "NO_IMAGE_URL", "No image URL in response");

    const imgRes = await undiciFetch(imageUrl);
    if (!imgRes.ok) throw new ImageError("flux-pro", "DOWNLOAD_FAILED", `HTTP ${imgRes.status}`);

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    // $0.05/image × 90 ₽/$ = 4.5 ₽
    return {
      buffer,
      mimeType: "image/jpeg",
      costRub: 4.5,
      provider: this.name,
    };
  }
}
