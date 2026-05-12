import type { Project, Scene } from "@workspace/db";

export type RenderQuality = "sd" | "hd" | "uhd";

export interface CostOptions {
  quality: RenderQuality;
  removeWatermark: boolean;
}

export interface CostLine {
  label: string;
  detail?: string;
  tokens: number;
}

export interface CostBreakdown {
  lines: CostLine[];
  subtotal: number;
  qualityMultiplier: number;
  qualityLabel: string;
  watermarkBonus: number;
  beforeMarkup: number;
  markupPercent: number;
  markup: number;
  total: number;
}

const QUALITY_META: Record<RenderQuality, { mult: number; label: string }> = {
  sd: { mult: 1.0, label: "Стандарт 720p" },
  hd: { mult: 1.5, label: "HD 1080p" },
  uhd: { mult: 2.5, label: "4K UHD" },
};

export const MARKUP_PERCENT = 40;

export function parseQuality(input: unknown): RenderQuality {
  if (input === "hd" || input === "uhd" || input === "sd") return input;
  return "sd";
}

/**
 * Calculate token cost for rendering a project.
 * Mocks "AI resource" usage: image generation, voice synthesis, music license,
 * quality multiplier, watermark removal — then a fixed markup on top.
 */
export function computeProjectCost(
  project: Project,
  scenes: Scene[],
  options: CostOptions,
): CostBreakdown {
  const lines: CostLine[] = [];

  const sceneCount = scenes.length;
  const imagesCost = sceneCount * 4;
  lines.push({
    label: "Генерация изображений",
    detail: `${sceneCount} сцен × 4 жетона`,
    tokens: imagesCost,
  });

  const totalChars = scenes.reduce(
    (acc, s) => acc + (s.narration.length ?? 0),
    0,
  );
  const voiceCost = Math.max(2, Math.ceil(totalChars / 100));
  lines.push({
    label: "Синтез речи",
    detail: `${totalChars} симв. (~1 жетон / 100 симв.)`,
    tokens: voiceCost,
  });

  const animationCost = sceneCount * 2;
  lines.push({
    label: "Анимация и переходы",
    detail: `${sceneCount} сцен × 2 жетона`,
    tokens: animationCost,
  });

  if (project.background_music_id) {
    lines.push({
      label: "Фоновая музыка (лицензия)",
      detail: project.background_music_id ?? "",
      tokens: 5,
    });
  }

  if (project.add_subtitles) {
    lines.push({
      label: "Субтитры",
      detail: "Распознавание и тайминги",
      tokens: 3,
    });
  }

  const subtotal = lines.reduce((acc, l) => acc + l.tokens, 0);

  const q = QUALITY_META[options.quality];
  const afterQuality = Math.ceil(subtotal * q.mult);

  const watermarkBonus = options.removeWatermark ? 10 : 0;
  const beforeMarkup = afterQuality + watermarkBonus;

  const markup = Math.ceil((beforeMarkup * MARKUP_PERCENT) / 100);
  const total = beforeMarkup + markup;

  return {
    lines,
    subtotal,
    qualityMultiplier: q.mult,
    qualityLabel: q.label,
    watermarkBonus,
    beforeMarkup,
    markupPercent: MARKUP_PERCENT,
    markup,
    total,
  };
}
