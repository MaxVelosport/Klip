import { FPS } from "./types.js";

export type KenBurnsEffect = "zoom-in" | "zoom-out" | "pan-right" | "pan-left" | "pan-up" | "pan-down";

const EFFECTS: KenBurnsEffect[] = ["zoom-in", "zoom-out", "pan-right", "pan-left", "pan-up", "pan-down"];

export function randomEffect(seed: number): KenBurnsEffect {
  return EFFECTS[seed % EFFECTS.length]!;
}

/**
 * Returns a ffmpeg filter_complex fragment that takes a looped still image
 * and produces a Ken Burns animated clip at the target resolution.
 *
 * The input image is first scaled to 1.5× output size to provide zoom headroom.
 * zoompan z coordinates: 1.0 = full 1.5× scaled image shown at output size.
 * Zoom range 1.0–1.3 corresponds to 0–23% extra zoom on the scaled image.
 */
export function kenBurnsFilterChain(
  durationSec: number,
  outputW: number,
  outputH: number,
  effect: KenBurnsEffect,
): string {
  const d = Math.round(durationSec * FPS);
  // Scale input to 1.5× output to have room for zoom/pan
  const sw = Math.round(outputW * 1.5);
  const sh = Math.round(outputH * 1.5);

  let zExpr: string;
  let xExpr: string;
  let yExpr: string;

  switch (effect) {
    case "zoom-in":
      zExpr = `min(1.0+0.3*on/${d},1.3)`;
      xExpr = `(iw-iw/zoom)/2`;
      yExpr = `(ih-ih/zoom)/2`;
      break;
    case "zoom-out":
      zExpr = `max(1.3-0.3*on/${d},1.0)`;
      xExpr = `(iw-iw/zoom)/2`;
      yExpr = `(ih-ih/zoom)/2`;
      break;
    case "pan-right":
      zExpr = `1.2`;
      xExpr = `(iw-iw/zoom)*on/${d}`;
      yExpr = `(ih-ih/zoom)/2`;
      break;
    case "pan-left":
      zExpr = `1.2`;
      xExpr = `(iw-iw/zoom)*(1-on/${d})`;
      yExpr = `(ih-ih/zoom)/2`;
      break;
    case "pan-up":
      zExpr = `1.2`;
      xExpr = `(iw-iw/zoom)/2`;
      yExpr = `(ih-ih/zoom)*on/${d}`;
      break;
    case "pan-down":
      zExpr = `1.2`;
      xExpr = `(iw-iw/zoom)/2`;
      yExpr = `(ih-ih/zoom)*(1-on/${d})`;
      break;
  }

  // Filter chain: scale to 1.5× → crop to exact scaled size → zoompan to output
  return [
    `scale=${sw}:${sh}:force_original_aspect_ratio=increase`,
    `crop=${sw}:${sh}`,
    `zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${d}:fps=${FPS}:s=${outputW}x${outputH}`,
  ].join(",");
}
