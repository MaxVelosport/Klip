import { z } from "zod";
import { getLLMWithFallback } from "./llm/factory.js";
import { LLMError } from "./llm/types.js";
import type { Scene } from "@workspace/db";

export interface SceneUpdate {
  id: string;
  title?: string;
  narration?: string;
  image_prompt?: string;
}

export interface EditResult {
  updates: SceneUpdate[];
  summary: string;
}

const UpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100).optional(),
  narration: z.string().min(1).max(2000).optional(),
  image_prompt: z.string().min(1).max(1000).optional(),
});

const EditResponseSchema = z.object({
  updates: z.array(UpdateSchema),
  summary: z.string().min(1).max(500),
});

function scenesToContext(scenes: Scene[]): string {
  return scenes.map((s, i) =>
    `Сцена ${i + 1} (id: ${s.id}):\n  Заголовок: ${s.title}\n  Нарратив: ${s.narration}\n  Промпт изображения: ${s.image_prompt}`,
  ).join("\n\n");
}

function extractJSON(raw: string): string {
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1]!.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

export async function editScript(scenes: Scene[], userMessage: string): Promise<EditResult> {
  const llm = getLLMWithFallback();

  const system = `Ты ассистент по редактированию сценариев видео для платформы НейроКлип.
Пользователь просит внести правки в существующий сценарий.
Верни ТОЛЬКО валидный JSON без markdown-блоков.`;

  const user = `Текущий сценарий:
${scenesToContext(scenes)}

Правка от пользователя: "${userMessage}"

Верни JSON в формате:
{
  "updates": [
    {
      "id": "uuid сцены которую нужно изменить",
      "title": "новый заголовок (если меняется)",
      "narration": "новый текст диктора (если меняется)",
      "image_prompt": "новый промпт изображения (если меняется)"
    }
  ],
  "summary": "Краткое описание что было изменено (1-2 предложения)"
}

Правила:
- Включай в updates только те сцены, которые реально нужно изменить
- Включай в объект update только те поля, которые изменились
- Если правка касается всех сцен — включи все; если одной — только её
- summary — по-русски, конкретно что изменил`;

  let lastError: Error | null = null;
  let feedbackSuffix = "";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await llm.chat(
        [
          { role: "system", content: system },
          { role: "user", content: user + feedbackSuffix },
        ],
        { temperature: 0.7, maxTokens: 2048, jsonMode: true },
      );

      const jsonStr = extractJSON(response.content);
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        throw new LLMError(llm.name, "INVALID_JSON", `Попытка ${attempt}: не удалось разобрать JSON`);
      }

      const validated = EditResponseSchema.safeParse(parsed);
      if (!validated.success) {
        const issues = validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        throw new LLMError(llm.name, "SCHEMA_ERROR", `Попытка ${attempt}: невалидная схема: ${issues}`);
      }

      // Filter out updates for scene IDs that don't exist
      const knownIds = new Set(scenes.map((s) => s.id));
      const validUpdates = validated.data.updates.filter((u) => knownIds.has(u.id));

      console.info(`[script-editor] ${llm.name} attempt ${attempt} OK, updates: ${validUpdates.length}, cost: ${response.costRub.toFixed(4)}₽`);
      return { updates: validUpdates, summary: validated.data.summary };
    } catch (err) {
      lastError = err as Error;
      console.warn(`[script-editor] attempt ${attempt} failed:`, lastError.message);
      feedbackSuffix = `\n\nОшибка предыдущего ответа: ${lastError.message.slice(0, 150)}. Верни ТОЛЬКО валидный JSON.`;
    }
  }

  throw lastError ?? new Error("editScript: все попытки исчерпаны");
}
