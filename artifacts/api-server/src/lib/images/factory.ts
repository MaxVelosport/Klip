import { NanoBananaFlashProvider } from "./nano-banana-flash.js";
import { NanoBananaProProvider } from "./nano-banana-pro.js";
import { KandinskyGigaChatProvider } from "./kandinsky-gigachat.js";
import { FluxSchnellProvider } from "./flux-schnell.js";
import type { ImageGenerationParams, ImageGenerationResult, ImageProvider } from "./types.js";

export function getImageProvider(name?: string): ImageProvider {
  const provider = (name ?? process.env.IMAGE_PROVIDER ?? "nano-banana-flash").toLowerCase();
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
    default: throw new Error(`Unknown image provider: ${provider}`);
  }
}

class FallbackImageProvider implements ImageProvider {
  constructor(private primary: ImageProvider, private fallback: ImageProvider) {}

  get name() { return `${this.primary.name}|${this.fallback.name}`; }

  async generate(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    try {
      return await this.primary.generate(params);
    } catch (err) {
      console.warn(`[ImageGen] ${this.primary.name} failed, falling back to ${this.fallback.name}:`, (err as Error).message);
      return await this.fallback.generate(params);
    }
  }
}

export function getImageProviderWithFallback(primaryName?: string): ImageProvider {
  const primary = getImageProvider(primaryName ?? process.env.IMAGE_PROVIDER);
  const fallbackName = process.env.IMAGE_FALLBACK_PROVIDER ?? "kandinsky-gigachat";
  if (primary.name === fallbackName || primary.name.includes(fallbackName)) return primary;
  const fallback = getImageProvider(fallbackName);
  return new FallbackImageProvider(primary, fallback);
}
