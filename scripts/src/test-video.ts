/**
 * Test video rendering end-to-end.
 * Usage: tsx --env-file=.env scripts/src/test-video.ts
 *
 * Requires: at least one project with both image and audio files in storage/
 */
import { existsSync, readdirSync } from "node:fs";
import { FFmpegRenderer } from "../../artifacts/api-server/src/lib/video/ffmpeg-renderer.js";
import type { SceneAsset } from "../../artifacts/api-server/src/lib/video/types.js";

const STORAGE = "/home/deploy/projects/neuroclip/storage";
const PROJECT_ID = process.argv[2] ?? "";

// Auto-detect project with both images and audio
function findTestProject(): string | null {
  const imgDir = `${STORAGE}/images`;
  if (!existsSync(imgDir)) return null;
  for (const proj of readdirSync(imgDir)) {
    const audioDir = `${STORAGE}/audio/${proj}`;
    if (existsSync(audioDir) && readdirSync(audioDir).length > 0) return proj;
  }
  return null;
}

const projectId = PROJECT_ID || findTestProject();
if (!projectId) {
  console.error("No project with both images and audio found. Run generate-audio first.");
  process.exit(1);
}

const imageFiles = readdirSync(`${STORAGE}/images/${projectId}`).filter(f => f.endsWith(".jpg"));
const audioFiles = readdirSync(`${STORAGE}/audio/${projectId}`);

if (imageFiles.length === 0 || audioFiles.length === 0) {
  console.error(`Project ${projectId} missing images or audio files.`);
  process.exit(1);
}

// Match image scene IDs to audio scene IDs
const scenes: SceneAsset[] = [];
for (let i = 0; i < Math.min(imageFiles.length, audioFiles.length, 4); i++) {
  const sceneId = imageFiles[i]!.replace(".jpg", "");
  const audioFile = audioFiles.find(f => f.startsWith(sceneId)) ?? audioFiles[i]!;
  scenes.push({
    id: sceneId,
    orderIndex: i,
    imageUrl: `${STORAGE}/images/${projectId}/${imageFiles[i]}`,
    audioUrl: `${STORAGE}/audio/${projectId}/${audioFile}`,
    durationSec: 7,
    narration: `Это тестовый субтитр для сцены номер ${i + 1} в тестовом видео.`,
  });
}

console.log(`[test-video] project=${projectId}, scenes=${scenes.length}`);
scenes.forEach((s, i) => {
  console.log(`  scene ${i + 1}: img=${s.imageUrl.split("/").pop()} audio=${s.audioUrl.split("/").pop()}`);
});

const renderer = new FFmpegRenderer();
const outputPath = `/tmp/test-render-${projectId.slice(0, 8)}.mp4`;
const t0 = Date.now();

try {
  await renderer.render(
    {
      projectId,
      scenes,
      aspectRatio: "16:9",
      addSubtitles: true,
      outputPath,
    },
    (progress) => {
      console.log(`  [${progress.stage}] scenes ${progress.scenesCompleted}/${progress.scenesTotal} — ${progress.elapsedMs}ms`);
    },
  );

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const { statSync } = await import("node:fs");
  const size = (statSync(outputPath).size / 1024 / 1024).toFixed(1);
  console.log(`\n✓ Rendered in ${elapsed}s → ${outputPath} (${size} MB)`);
  console.log(`  Check: ffprobe -v error -show_entries format=duration,size -of csv=p=0 ${outputPath}`);
} catch (err) {
  console.error(`\n✗ Render failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
