import type { SceneAsset } from "./types.js";

function padMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const millis = ms % 1000;
  const hours   = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":") + "," + String(millis).padStart(3, "0");
}

function wrapText(text: string, maxChars = 42): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 > maxChars && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function generateSRT(scenes: SceneAsset[], wrapChars = 42): string {
  let srt = "";
  let cumulativeMs = 0;
  let idx = 1;

  for (const scene of scenes) {
    const durationMs = Math.round(scene.durationSec * 1000);
    const lines = wrapText(scene.narration.trim(), wrapChars);
    const MAX_LINES_PER_BLOCK = 40; // chars per line × 2 lines is typical for subtitles

    // Split long narrations into sub-blocks
    const blockCount = Math.max(1, Math.ceil(lines.length / 2));
    const msPerBlock = Math.floor(durationMs / blockCount);

    let blockStart = cumulativeMs;
    for (let b = 0; b < blockCount; b++) {
      const blockLines = lines.slice(b * 2, b * 2 + 2).join("\n");
      const blockEnd = b < blockCount - 1 ? blockStart + msPerBlock : cumulativeMs + durationMs;
      srt += `${idx}\n`;
      srt += `${padMs(blockStart)} --> ${padMs(blockEnd)}\n`;
      srt += `${blockLines}\n\n`;
      blockStart = blockEnd;
      idx++;
    }

    cumulativeMs += durationMs;
  }

  return srt;
}
