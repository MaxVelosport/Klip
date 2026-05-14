import { z } from "zod";
import { getLLMWithFallback } from "./llm/factory.js";
import { LLMError } from "./llm/types.js";

export interface ScriptParams {
  title: string;
  topicDescription: string;
  category: string;
  targetDurationSec: number;
  visualStyle: string;
  voiceId?: string;
  aspectRatio?: string;
  addSubtitles?: boolean;
}

export interface GeneratedSceneData {
  title: string;
  narration: string;
  image_prompt_ru: string;
  image_prompt_en: string;
  duration_sec: number;
}

const SceneSchema = z.object({
  title: z.string().min(1).max(100),
  narration: z.string().min(10).max(2000),
  image_prompt_ru: z.string().min(5).max(500),
  image_prompt_en: z.string().min(5).max(500),
  duration_sec: z.number().min(3).max(60),
});

const ScriptSchema = z.object({
  scenes: z.array(SceneSchema).min(3).max(20),
});

function buildSystemPrompt(): string {
  return `Ты профессиональный сценарист коротких образовательных видео на русском языке для платформы НейроКлип.
Твоя задача — создать живой, увлекательный сценарий с конкретными сценами.
Каждая сцена должна иметь чёткое начало и конец, текст диктора на естественном русском языке (не книжном), и подробное описание визуального ряда.
Всегда отвечай только валидным JSON без markdown-блоков.`;
}

function buildUserPrompt(params: ScriptParams): string {
  const sceneCount = Math.max(3, Math.min(15, Math.round(params.targetDurationSec / 15)));
  const perScene = Math.round(params.targetDurationSec / sceneCount);

  return `Создай сценарий видео на тему: "${params.topicDescription}"

Параметры:
- Длительность: ~${params.targetDurationSec} секунд
- Категория: ${params.category}
- Визуальный стиль: ${params.visualStyle}
- Примерное количество сцен: ${sceneCount} (по ~${perScene} сек каждая)

Верни JSON строго в формате:
{
  "scenes": [
    {
      "title": "Короткий заголовок сцены (до 60 символов)",
      "narration": "Текст диктора — живой, естественный русский язык, без канцелярита. 2-4 предложения.",
      "image_prompt_ru": "Описание картинки на русском: что изображено, настроение, ракурс, детали",
      "image_prompt_en": "Same image description in English with art style hints for AI image generator. Include: style keywords, lighting, composition, mood.",
      "duration_sec": ${perScene}
    }
  ]
}

Требования:
- Первая сцена должна захватить внимание с первых секунд (хук)
- Последняя сцена — вывод или призыв к действию
- Текст диктора должен быть в разговорном стиле, без сложных терминов
- image_prompt_en должен включать art style из визуального стиля "${params.visualStyle}"
- Суммарная длительность сцен должна быть близка к ${params.targetDurationSec} секундам`;
}

function extractJSON(raw: string): string {
  // Strip markdown code blocks if present
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1]!.trim();
  // Try to find a JSON object directly
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

export async function generateScript(params: ScriptParams): Promise<GeneratedSceneData[]> {
  const llm = getLLMWithFallback();
  const system = buildSystemPrompt();
  const user = buildUserPrompt(params);

  let lastError: Error | null = null;
  let feedbackSuffix = "";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await llm.chat(
        [
          { role: "system", content: system },
          { role: "user", content: user + feedbackSuffix },
        ],
        { temperature: 0.8, maxTokens: 4096, jsonMode: true },
      );

      const jsonStr = extractJSON(response.content);
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        throw new LLMError(llm.name, "INVALID_JSON", `Попытка ${attempt}: не удалось разобрать JSON. Ответ: ${jsonStr.slice(0, 200)}`);
      }

      const validated = ScriptSchema.safeParse(parsed);
      if (!validated.success) {
        const issues = validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        throw new LLMError(llm.name, "SCHEMA_ERROR", `Попытка ${attempt}: невалидная схема: ${issues}`);
      }

      console.info(`[script-generator] ${llm.name} attempt ${attempt} OK, scenes: ${validated.data.scenes.length}, cost: ${response.costRub.toFixed(4)}₽`);
      return validated.data.scenes;
    } catch (err) {
      lastError = err as Error;
      console.warn(`[script-generator] attempt ${attempt} failed:`, lastError.message);
      feedbackSuffix = `\n\nВАЖНО: предыдущий ответ содержал ошибку: ${lastError.message.slice(0, 200)}. Верни ТОЛЬКО валидный JSON без markdown, без пояснений.`;
    }
  }

  throw lastError ?? new Error("generateScript: все попытки исчерпаны");
}
