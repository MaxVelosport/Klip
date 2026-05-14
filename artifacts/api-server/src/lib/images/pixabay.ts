import { fetch as undiciFetch, ProxyAgent } from "undici";
import type { ImageGenerationParams, ImageGenerationResult, ImageProvider } from "./types.js";
import { ImageError } from "./types.js";

// Cloudflare blocks datacenter IPs — route Pixabay through HTTPS_PROXY when set
function makeDispatcher() {
  const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  if (proxy) return new ProxyAgent(proxy);
  return undefined;
}

interface PixabayHit {
  id: number;
  webformatURL: string;
  largeImageURL: string;
  tags: string;
  imageWidth: number;
  imageHeight: number;
}

interface PixabayResponse {
  total: number;
  totalHits: number;
  hits: PixabayHit[];
}

const STOPWORDS = new Set([
  "a", "an", "the", "of", "on", "in", "at", "to", "and", "or", "with", "for", "is", "are",
  "photo", "photograph", "realistic", "photorealistic", "image", "render", "shot", "scene",
  "cinematic", "dramatic", "professional", "beautiful", "stunning", "high", "quality",
  "style", "view", "background", "close", "closeup", "detailed", "detail", "lighting",
]);

function extractKeywords(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
    .slice(0, 5)
    .join(" ");
}

export class PixabayProvider implements ImageProvider {
  readonly name = "pixabay";

  async generate(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) throw new ImageError("pixabay", "NO_API_KEY", "PIXABAY_API_KEY не задан");

    const query = extractKeywords(params.prompt);
    if (!query) throw new ImageError("pixabay", "EMPTY_QUERY", "Не удалось извлечь ключевые слова");

    const orientation =
      params.aspectRatio === "9:16" ? "vertical" :
      params.aspectRatio === "1:1"  ? "all" :
      "horizontal";

    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("q", query);
    url.searchParams.set("image_type", "photo");
    url.searchParams.set("orientation", orientation);
    url.searchParams.set("per_page", "5");
    url.searchParams.set("safesearch", "true");
    url.searchParams.set("order", "popular");

    const dispatcher = makeDispatcher();
    const fetchOpts = (dispatcher ? { dispatcher } : {}) as Parameters<typeof undiciFetch>[1];

    const searchRes = await undiciFetch(url.toString(), fetchOpts);
    if (!searchRes.ok) {
      const text = await (searchRes as Response).text().catch(() => "");
      throw new ImageError("pixabay", `SEARCH_${searchRes.status}`, text.slice(0, 200));
    }

    const data = (await (searchRes as Response).json()) as PixabayResponse;
    if (!data.hits || data.hits.length === 0) {
      throw new ImageError("pixabay", "NO_RESULTS", `Не найдено фото для "${query}"`);
    }

    // Pick randomly from top-3 for variety
    const pick = data.hits[Math.floor(Math.random() * Math.min(3, data.hits.length))]!;

    const imgRes = await undiciFetch(pick.largeImageURL, fetchOpts);
    if (!imgRes.ok) {
      throw new ImageError("pixabay", "DOWNLOAD_FAILED", `Не скачать изображение ${pick.id}`);
    }

    const buffer = Buffer.from(await (imgRes as Response).arrayBuffer());
    return {
      buffer,
      mimeType: "image/jpeg",
      costRub: 0,
      provider: this.name,
    };
  }
}
