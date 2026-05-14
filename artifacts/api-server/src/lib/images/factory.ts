import { NanoBananaFlashProvider } from "./nano-banana-flash.js";
import { NanoBananaProProvider } from "./nano-banana-pro.js";
import { KandinskyGigaChatProvider } from "./kandinsky-gigachat.js";
import { FluxSchnellProvider } from "./flux-schnell.js";
import { PixabayProvider } from "./pixabay.js";
import type { ImageGenerationParams, ImageGenerationResult, ImageProvider } from "./types.js";

export function getImageProvider(name?: string): ImageProvider {
  const provider = (name ?? process.env.IMAGE_PROVIDER ?? "kandinsky-gigachat").toLowerCase();
  switch (provider) {
    case "nano-banana-flash":
    case "flash": return new NanoBananaFlashProvider();
    case "nano-banana-pro":
    case "pro": return new NanoBananaProProvider();
    case "kandinsky":
    case "kandinsky-gigachat":
    case "gigachat": return new KandinskyGigaChatProvider();
    case "flux-schnell":
    case "flux": return new FluxSchnellProvider();
    case "pixabay": return new PixabayProvider();
    default: throw new Error(`Unknown image provider: ${provider}`);
  }
}

class FallbackImageProvider implements ImageProvider {
  constructor(private chain: ImageProvider[]) {}

  get name() { return this.chain.map(p => p.name).join("|"); }

  async generate(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    let lastErr: unknown;
    for (const provider of this.chain) {
      try {
        return await provider.generate(params);
      } catch (err) {
        console.warn(`[ImageGen] ${provider.name} failed: ${(err as Error).message?.slice(0, 100)}`);
        lastErr = err;
      }
    }
    throw lastErr;
  }
}

export function getImageProviderWithFallback(primaryName?: string): ImageProvider {
  const primary = getImageProvider(primaryName ?? process.env.IMAGE_PROVIDER);
  const fallbackName = process.env.IMAGE_FALLBACK_PROVIDER ?? "kandinsky-gigachat";

  const chain: ImageProvider[] = [primary];

  // Add explicit fallback if different from primary
  if (primary.name !== fallbackName && !primary.name.includes(fallbackName)) {
    try {
      chain.push(getImageProvider(fallbackName));
    } catch { /* unknown provider — skip */ }
  }

  // Always append Pixabay as last-resort safety net (if not already in chain)
  const hasPixabay = chain.some(p => p.name === "pixabay");
  if (!hasPixabay && process.env.PIXABAY_API_KEY) {
    chain.push(new PixabayProvider());
  }

  return chain.length === 1 ? chain[0]! : new FallbackImageProvider(chain);
}
