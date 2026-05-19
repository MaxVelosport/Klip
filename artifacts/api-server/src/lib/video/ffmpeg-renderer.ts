import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { RenderParams, RenderProgress, VideoRenderer } from "./types.js";
import { RenderError, RESOLUTION, FPS, VIDEO_BITRATE } from "./types.js";
import { kenBurnsFilterChain, randomEffect } from "./ken-burns.js";
import { buildConcatFilter, randomTransition, TRANSITION_DURATION } from "./transitions.js";
import { generateSRT, SUBTITLE_STYLE } from "./subtitles.js";

const FFMPEG = "ffmpeg";
const FFPROBE = "ffprobe";

function runFFmpeg(args: string[], timeoutMs = 300_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new RenderError("ffmpeg", "TIMEOUT", `ffmpeg exceeded ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new RenderError("ffmpeg", `EXIT_${code}`, stderr.slice(-500)));
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new RenderError("ffmpeg", "SPAWN", err.message));
    });
  });
}

async function probeDuration(audioPath: string): Promise<number | null> {
  return new Promise((resolve) => {
    const proc = spawn(FFPROBE, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      audioPath,
    ], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    proc.stdout.on("data", (d: Buffer) => { out += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) {
        const val = parseFloat(out.trim());
        resolve(isNaN(val) ? null : val);
      } else {
        resolve(null);
      }
    });
    proc.on("error", () => resolve(null));
  });
}

export class FFmpegRenderer implements VideoRenderer {
  readonly name = "ffmpeg";

  async render(
    params: RenderParams,
    onProgress?: (p: RenderProgress) => void,
  ): Promise<string> {
    const { projectId, scenes, aspectRatio, addSubtitles, backgroundMusicPath, outputPath } = params;
    const { w: outW, h: outH } = RESOLUTION[aspectRatio];
    const startMs = Date.now();
    const tmpDir = `/tmp/render/${projectId}-${randomUUID().slice(0, 8)}`;

    const progress = (
      stage: RenderProgress["stage"],
      scenesCompleted: number,
      errorMessage?: string,
    ) => onProgress?.({
      stage,
      scenesCompleted,
      scenesTotal: scenes.length,
      elapsedMs: Date.now() - startMs,
      errorMessage,
    });

    await mkdir(tmpDir, { recursive: true });

    try {
      // ── Phase 1: per-scene clips ─────────────────────────────
      progress("rendering_scenes", 0);
      const clipPaths: string[] = [];
      const clipDurations: number[] = [];

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i]!;

        // Use real audio duration when available
        const audioDuration = await probeDuration(scene.audioUrl).catch(() => null);
        const durationSec = audioDuration ?? scene.durationSec;
        clipDurations.push(durationSec);

        const clipPath = join(tmpDir, `clip-${i}.mp4`);

        if (scene.videoUrl) {
          // AI-generated video clip: scale to output size + trim/pad to audio duration
          await runFFmpeg([
            "-i", scene.videoUrl,
            "-i", scene.audioUrl,
            "-filter_complex",
            `[0:v]scale=${outW}:${outH}:force_original_aspect_ratio=increase,crop=${outW}:${outH},setsar=1,fps=${FPS}[v]`,
            "-map", "[v]",
            "-map", "1:a",
            "-c:v", "libx264",
            "-preset", "fast",
            "-b:v", VIDEO_BITRATE,
            "-c:a", "aac",
            "-b:a", "128k",
            "-pix_fmt", "yuv420p",
            "-shortest",
            "-y", clipPath,
          ]);
        } else {
          // Static image with Ken Burns effect
          const effect = randomEffect(i);
          const kbFilter = kenBurnsFilterChain(durationSec, outW, outH, effect, i * 3 + 1);
          await runFFmpeg([
            "-loop", "1",
            "-t", String(durationSec),
            "-i", scene.imageUrl,
            "-i", scene.audioUrl,
            "-filter_complex", `[0:v]${kbFilter}[v]`,
            "-map", "[v]",
            "-map", "1:a",
            "-c:v", "libx264",
            "-preset", "fast",
            "-b:v", VIDEO_BITRATE,
            "-c:a", "aac",
            "-b:a", "128k",
            "-pix_fmt", "yuv420p",
            "-shortest",
            "-y", clipPath,
          ]);
        }

        clipPaths.push(clipPath);
        progress("rendering_scenes", i + 1);
      }

      // ── Phase 2: concatenate with transitions ────────────────
      progress("concatenating", scenes.length);
      const concatPath = join(tmpDir, "concat.mp4");

      if (clipPaths.length === 1) {
        // Single clip — just copy it
        await runFFmpeg(["-i", clipPaths[0]!, "-c", "copy", "-y", concatPath]);
      } else {
        const transitions = clipDurations.map((_, i) => randomTransition(i));
        const { filterComplex, videoOut, audioOut } = buildConcatFilter(clipDurations, transitions);

        const inputArgs: string[] = clipPaths.flatMap(p => ["-i", p]);
        await runFFmpeg([
          ...inputArgs,
          "-filter_complex", filterComplex,
          "-map", `[${videoOut}]`,
          "-map", `[${audioOut}]`,
          "-c:v", "libx264",
          "-preset", "fast",
          "-b:v", VIDEO_BITRATE,
          "-c:a", "aac",
          "-b:a", "128k",
          "-pix_fmt", "yuv420p",
          "-y", concatPath,
        ]);
      }

      // ── Phase 3a: background music (optional) ────────────────
      let musicInputPath = concatPath;
      if (backgroundMusicPath) {
        const musicPath = join(tmpDir, "with-music.mp4");
        await runFFmpeg([
          "-i", concatPath,
          "-stream_loop", "-1",
          "-i", backgroundMusicPath,
          "-filter_complex",
          "[1:a]volume=0.2,atrim=0:DURATION[bg];[0:a][bg]amix=inputs=2:duration=first[a]".replace(
            "DURATION",
            String(clipDurations.reduce((sum, d, i) => sum + d - (i < clipDurations.length - 1 ? TRANSITION_DURATION : 0), 0)),
          ),
          "-map", "0:v",
          "-map", "[a]",
          "-c:v", "copy",
          "-c:a", "aac",
          "-b:a", "128k",
          "-y", musicPath,
        ]);
        musicInputPath = musicPath;
      }

      // ── Phase 3b: subtitles ───────────────────────────────────
      let currentInput = musicInputPath;
      if (addSubtitles) {
        progress("adding_subtitles", scenes.length);
        const srtPath = join(tmpDir, "subs.srt");
        // Adjust scene durations for xfade overlap
        const adjustedScenes = scenes.map((s, i) => ({
          ...s,
          durationSec: clipDurations[i]! - (i < scenes.length - 1 ? TRANSITION_DURATION : 0),
        }));
        await writeFile(srtPath, generateSRT(adjustedScenes));

        const subsPath = join(tmpDir, "with-subs.mp4");
        // Escape colon in path for subtitles filter on Linux
        const escapedSrt = srtPath.replace(/:/g, "\\:");
        await runFFmpeg([
          "-i", currentInput,
          "-vf", `subtitles=${escapedSrt}:force_style='${SUBTITLE_STYLE}'`,
          "-c:v", "libx264",
          "-preset", "fast",
          "-b:v", VIDEO_BITRATE,
          "-c:a", "copy",
          "-pix_fmt", "yuv420p",
          "-y", subsPath,
        ]);
        currentInput = subsPath;
      }

      // ── Final: move to output path ───────────────────────────
      await runFFmpeg(["-i", currentInput, "-c", "copy", "-y", outputPath]);

      progress("completed", scenes.length);
      return outputPath;
    } finally {
      // Clean up temp files after success or failure
      await rm(tmpDir, { recursive: true, force: true }).catch(() => null);
    }
  }
}
