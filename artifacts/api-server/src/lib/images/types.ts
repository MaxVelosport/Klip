export interface ImageGenerationParams {
  prompt: string;
  promptRu?: string;
  width?: number;
  height?: number;
  seed?: number;
  style?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
}

export interface ImageGenerationResult {
  buffer: Buffer;
  mimeType: string;
  costRub: number;
  provider: string;
}

export interface ImageProvider {
  name: string;
  generate(params: ImageGenerationParams): Promise<ImageGenerationResult>;
}

export class ImageError extends Error {
  constructor(public provider: string, public code: string, message: string) {
    super(`[${provider}/${code}] ${message}`);
  }
}
