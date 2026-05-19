export interface VideoGenerationParams {
  imageUrl: string;
  prompt: string;
  durationSec: number;
  aspectRatio?: "16:9" | "9:16" | "1:1";
}

export interface VideoGenerationResult {
  buffer: Buffer;
  mimeType: "video/mp4";
  durationSec: number;
  costRub: number;
  provider: string;
}

export interface VideoClipProvider {
  readonly name: string;
  generate(params: VideoGenerationParams): Promise<VideoGenerationResult>;
}

export class VideoError extends Error {
  constructor(public provider: string, public code: string, message: string) {
    super(`[${provider}/${code}] ${message}`);
  }
}
