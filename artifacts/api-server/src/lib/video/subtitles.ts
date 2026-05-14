import type { SceneAsset } from "./types.js";

export const SUBTITLE_STYLE = [
  "Fontname=DejaVu Sans Bold",
  "Fontsize=42",
  "PrimaryColour=&H00FFFFFF",
  "OutlineColour=&H00000000",
  "BorderStyle=1",
  "Outline=3",
  "Shadow=1",
  "Bold=1",
  "Alignment=2",
  "MarginV=120",
].join(",");

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

function wrapText(text: string, maxChars = 30): string[] {
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

function cleanText(text: string): string {
  return text.trim().replace(/\.+$/, "");
}

export function generateSRT(scenes: SceneAsset[], wrapChars = 30): string {
  let srt = "";
  let cumulativeMs = 0;
  let idx = 1;

  for (const scene of scenes) {
    const durationMs = Math.round(scene.durationSec * 1000);
    const text = cleanText(scene.narration);
    const lines = wrapText(text, wrapChars);

    // Group into 2-line blocks; add a 100ms gap between sub-blocks for readability
    const GAP_MS = 100;
    const blockCount = Math.max(1, Math.ceil(lines.length / 2));
    const msPerBlock = Math.floor((durationMs - GAP_MS * (blockCount - 1)) / blockCount);

    let blockStart = cumulativeMs;
    for (let b = 0; b < blockCount; b++) {
      const blockLines = lines.slice(b * 2, b * 2 + 2).join("\n");
      const blockEnd = blockStart + msPerBlock;
      srt += `${idx}\n`;
      srt += `${padMs(blockStart)} --> ${padMs(Math.min(blockEnd, cumulativeMs + durationMs))}\n`;
      srt += `${blockLines}\n\n`;
      blockStart = blockEnd + GAP_MS;
      idx++;
    }

    cumulativeMs += durationMs;
  }

  return srt;
}
