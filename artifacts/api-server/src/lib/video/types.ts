export interface SceneAsset {
  id: string;
  orderIndex: number;
  imageUrl: string;   // absolute path on FS
  audioUrl: string;   // absolute path on FS
  durationSec: number;
  narration: string;  // for subtitles
}

export interface RenderParams {
  projectId: string;
  scenes: SceneAsset[];
  aspectRatio: "16:9" | "9:16" | "1:1";
  addSubtitles: boolean;
  backgroundMusicPath?: string;
  outputPath: string;
}

export interface RenderProgress {
  stage: "preparing" | "rendering_scenes" | "concatenating" | "adding_subtitles" | "completed" | "failed";
  scenesCompleted: number;
  scenesTotal: number;
  elapsedMs: number;
  errorMessage?: string;
}

export interface VideoRenderer {
  name: string;
  render(params: RenderParams, onProgress?: (p: RenderProgress) => void): Promise<string>;
}

export class RenderError extends Error {
  constructor(public stage: string, public code: string, message: string) {
    super(`[${stage}/${code}] ${message}`);
  }
}

export const RESOLUTION: Record<"16:9" | "9:16" | "1:1", { w: number; h: number }> = {
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
  "1:1":  { w: 1080, h: 1080 },
};

export const FPS = 30;
export const VIDEO_BITRATE = "2500k";
