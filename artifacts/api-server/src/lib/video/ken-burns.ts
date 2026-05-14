import { FPS } from "./types.js";

export type KenBurnsEffect =
  | "zoom-in" | "zoom-out"
  | "pan-right" | "pan-left" | "pan-up" | "pan-down"
  | "quiet-zoom";

const EFFECTS: KenBurnsEffect[] = [
  "zoom-in", "zoom-out",
  "pan-right", "pan-left", "pan-up", "pan-down",
  "quiet-zoom", "quiet-zoom",  // weighted 2×
];

export function randomEffect(seed: number): KenBurnsEffect {
  return EFFECTS[seed % EFFECTS.length]!;
}

// Rule-of-thirds focal points as fractions of output size
const FOCAL_POINTS = [
  [1/4, 1/4], [1/2, 1/4], [3/4, 1/4],
  [1/4, 1/2], [1/2, 1/2], [3/4, 1/2],
  [1/4, 3/4], [1/2, 3/4], [3/4, 3/4],
] as const;

/**
 * Returns a ffmpeg filter fragment (no leading [label]) that scales a looped
 * still image and applies a Ken Burns effect, outputting at the target resolution.
 *
 * Pre-scales input to 1.5× output for zoom headroom.
 * Max zoom 1.35 = 35% extra scale beyond the base 1.0.
 */
export function kenBurnsFilterChain(
  durationSec: number,
  outputW: number,
  outputH: number,
  effect: KenBurnsEffect,
  focalSeed = 0,
): string {
  const d = Math.round(durationSec * FPS);
  const sw = Math.round(outputW * 1.5);
  const sh = Math.round(outputH * 1.5);

  const [fx, fy] = FOCAL_POINTS[focalSeed % FOCAL_POINTS.length]!;
  // Focal point in zoomed-image coordinates (iw = sw, ih = sh in zoompan)
  // At zoom Z, the view covers iw/Z × ih/Z around the focal point.
  // x = clamp(focal_x * iw - iw/(2*Z), 0, iw - iw/Z)
  // Expressed as: focal_x*(iw-iw/zoom) clamped to [0, iw-iw/zoom]
  const fxExpr = `max(0,min(iw-iw/zoom,${fx.toFixed(4)}*(iw-iw/zoom)*2-iw/zoom/2+iw/zoom/2))`;

  // Simpler: shift center toward focal point proportionally
  const centerX = `(iw-iw/zoom)/2`;
  const centerY = `(ih-ih/zoom)/2`;
  // Focal offset from center, scaled by (zoom-1) to pull toward the focal point as we zoom
  const fxOff = `(${(fx - 0.5).toFixed(4)}*iw*(zoom-1)/zoom)`;
  const fyOff = `(${(fy - 0.5).toFixed(4)}*ih*(zoom-1)/zoom)`;
  const focalX = `max(0,min(iw-iw/zoom,${centerX}+${fxOff}))`;
  const focalY = `max(0,min(ih-ih/zoom,${centerY}+${fyOff}))`;

  let zExpr: string;
  let xExpr: string;
  let yExpr: string;

  switch (effect) {
    case "zoom-in":
      zExpr = `min(1.0+0.35*on/${d},1.35)`;
      xExpr = focalX;
      yExpr = focalY;
      break;
    case "zoom-out":
      zExpr = `max(1.35-0.35*on/${d},1.0)`;
      xExpr = focalX;
      yExpr = focalY;
      break;
    case "pan-right":
      zExpr = `1.25`;
      xExpr = `max(0,min(iw-iw/zoom,(iw-iw/zoom)*on/${d}+${(fx - 0.5).toFixed(4)}*iw*0.15))`;
      yExpr = focalY;
      break;
    case "pan-left":
      zExpr = `1.25`;
      xExpr = `max(0,min(iw-iw/zoom,(iw-iw/zoom)*(1-on/${d})+${(fx - 0.5).toFixed(4)}*iw*0.15))`;
      yExpr = focalY;
      break;
    case "pan-up":
      zExpr = `1.25`;
      xExpr = focalX;
      yExpr = `max(0,min(ih-ih/zoom,(ih-ih/zoom)*on/${d}+${(fy - 0.5).toFixed(4)}*ih*0.15))`;
      break;
    case "pan-down":
      zExpr = `1.25`;
      xExpr = focalX;
      yExpr = `max(0,min(ih-ih/zoom,(ih-ih/zoom)*(1-on/${d})+${(fy - 0.5).toFixed(4)}*ih*0.15))`;
      break;
    case "quiet-zoom":
      // Subtle 5% zoom, centered
      zExpr = `min(1.0+0.05*on/${d},1.05)`;
      xExpr = centerX;
      yExpr = centerY;
      break;
  }

  return [
    `scale=${sw}:${sh}:force_original_aspect_ratio=increase`,
    `crop=${sw}:${sh}`,
    `zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${d}:fps=${FPS}:s=${outputW}x${outputH}`,
  ].join(",");
}
