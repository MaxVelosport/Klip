import { FFmpegRenderer } from "./ffmpeg-renderer.js";
import type { VideoRenderer } from "./types.js";

export function getVideoRenderer(_name?: string): VideoRenderer {
  // Only one real renderer for now — ffmpeg
  return new FFmpegRenderer();
}
