import { Router, type IRouter } from "express";
import {
  db,
  projectsTable,
  scenesTable,
  renderJobsTable,
  auditLogTable,
  tokenBalancesTable,
  tokenTransactionsTable,
} from "@workspace/db";
import { and, eq, isNull, asc, sql } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../lib/session";
import { serializeScene } from "./projects";
import { generateScript, pickImage, SAMPLE_AUDIO_URL, SAMPLE_VIDEO_URL } from "../lib/mock-content";
import {
  computeProjectCost,
  parseQuality,
  type CostBreakdown,
} from "../lib/cost";

const router: IRouter = Router();

async function getBalance(userId: string): Promise<number> {
  const [bal] = await db
    .select()
    .from(tokenBalancesTable)
    .where(eq(tokenBalancesTable.userId, userId))
    .limit(1);
  return bal?.balance ?? 0;
}

/**
 * Atomically charge tokens. Returns { ok: true, balanceAfter } on success, or
 * { ok: false, balance } if the user does not have enough tokens. Uses a single
 * conditional UPDATE so two concurrent requests cannot both succeed.
 */
async function chargeTokens(
  userId: string,
  amount: number,
  projectId: string,
  reason: string,
): Promise<{ ok: true; balanceAfter: number } | { ok: false; balance: number }> {
  return await db.transaction(async (tx) => {
    await tx
      .insert(tokenBalancesTable)
      .values({ userId, balance: 0 })
      .onConflictDoNothing();
    const updated = await tx
      .update(tokenBalancesTable)
      .set({ balance: sql`${tokenBalancesTable.balance} - ${amount}` })
      .where(
        and(
          eq(tokenBalancesTable.userId, userId),
          sql`${tokenBalancesTable.balance} >= ${amount}`,
        ),
      )
      .returning({ balance: tokenBalancesTable.balance });
    if (updated.length === 0) {
      const [bal] = await tx
        .select()
        .from(tokenBalancesTable)
        .where(eq(tokenBalancesTable.userId, userId))
        .limit(1);
      return { ok: false as const, balance: bal?.balance ?? 0 };
    }
    await tx.insert(tokenTransactionsTable).values({
      userId,
      delta: -amount,
      reason,
      refId: projectId,
    });
    return { ok: true as const, balanceAfter: updated[0]!.balance };
  });
}

/**
 * Idempotent refund — if a refund row for (refId, reason="refund") already
 * exists, no double-credit. Used when an async render job ends in failure.
 */
async function refundTokens(
  userId: string,
  amount: number,
  jobId: string,
  note: string,
) {
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: tokenTransactionsTable.id })
      .from(tokenTransactionsTable)
      .where(
        and(
          eq(tokenTransactionsTable.refId, jobId),
          eq(tokenTransactionsTable.reason, "refund"),
        ),
      )
      .limit(1);
    if (existing.length) return;
    await tx
      .insert(tokenBalancesTable)
      .values({ userId, balance: 0 })
      .onConflictDoNothing();
    await tx
      .update(tokenBalancesTable)
      .set({ balance: sql`${tokenBalancesTable.balance} + ${amount}` })
      .where(eq(tokenBalancesTable.userId, userId));
    await tx.insert(tokenTransactionsTable).values({
      userId,
      delta: amount,
      reason: "refund",
      refId: jobId,
    });
    await tx.insert(auditLogTable).values({
      userId,
      action: "render_refund",
      entityType: "render_job",
      entityId: jobId,
      message: note,
    });
  });
}

async function loadProjectAndScenes(p: typeof projectsTable.$inferSelect) {
  const scenes = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.projectId, p.id))
    .orderBy(asc(scenesTable.orderIndex));
  return scenes;
}

function serializeCost(b: CostBreakdown) {
  return {
    lines: b.lines,
    subtotal: b.subtotal,
    qualityMultiplier: b.qualityMultiplier,
    qualityLabel: b.qualityLabel,
    watermarkBonus: b.watermarkBonus,
    beforeMarkup: b.beforeMarkup,
    markupPercent: b.markupPercent,
    markup: b.markup,
    total: b.total,
  };
}

async function ownProject(req: AuthedRequest) {
  const id = String(req.params.id);
  const [p] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, req.userId!), isNull(projectsTable.deletedAt)))
    .limit(1);
  return p ?? null;
}

async function returnProject(p: typeof projectsTable.$inferSelect, res: import("express").Response) {
  const [updated] = await db.select().from(projectsTable).where(eq(projectsTable.id, p.id)).limit(1);
  const scenes = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.projectId, p.id))
    .orderBy(asc(scenesTable.orderIndex));
  res.json({
    id: updated!.id,
    title: updated!.title,
    topicDescription: updated!.topicDescription,
    category: updated!.category,
    targetDurationSec: updated!.targetDurationSec,
    durationSec: updated!.durationSec,
    visualStyle: updated!.visualStyle,
    voiceId: updated!.voiceId,
    voiceSpeed: Number(updated!.voiceSpeed),
    backgroundMusicId: updated!.backgroundMusicId,
    musicVolume: updated!.musicVolume,
    addSubtitles: updated!.addSubtitles,
    status: updated!.status,
    currentStep: updated!.currentStep,
    finalVideoUrl: updated!.finalVideoUrl,
    thumbnailUrl: updated!.thumbnailUrl,
    errorMessage: updated!.errorMessage,
    scenes: scenes.map(serializeScene),
    createdAt: updated!.createdAt.toISOString(),
    updatedAt: updated!.updatedAt.toISOString(),
  });
}

router.post("/projects/:id/generate-script", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }
  await db.delete(scenesTable).where(eq(scenesTable.projectId, p.id));
  const generated = generateScript(p.topicDescription, p.targetDurationSec, p.visualStyle, (p.category ?? "educational") as Parameters<typeof generateScript>[3]);
  let totalDuration = 0;
  for (let i = 0; i < generated.length; i++) {
    const s = generated[i]!;
    totalDuration += s.durationSec;
    await db.insert(scenesTable).values({
      projectId: p.id,
      orderIndex: i,
      title: s.title,
      narration: s.narration,
      imagePrompt: s.imagePrompt,
      durationSec: String(s.durationSec),
    });
  }
  await db
    .update(projectsTable)
    .set({ status: "script_ready", durationSec: totalDuration, currentStep: Math.max(p.currentStep, 2) })
    .where(eq(projectsTable.id, p.id));
  await db.insert(auditLogTable).values({
    userId: req.userId!,
    action: "script_generated",
    entityType: "project",
    entityId: p.id,
    message: `Сгенерирован сценарий (${generated.length} сцен)`,
  });
  await returnProject(p, res);
});

router.post("/projects/:id/generate-images", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }
  const scenes = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.projectId, p.id))
    .orderBy(asc(scenesTable.orderIndex));
  for (const s of scenes) {
    await db
      .update(scenesTable)
      .set({ imageUrl: pickImage(s.id, s.orderIndex) })
      .where(eq(scenesTable.id, s.id));
  }
  const thumb = scenes[0] ? pickImage(scenes[0].id, 0) : null;
  await db
    .update(projectsTable)
    .set({ status: "images_ready", thumbnailUrl: thumb, currentStep: Math.max(p.currentStep, 3) })
    .where(eq(projectsTable.id, p.id));
  await db.insert(auditLogTable).values({
    userId: req.userId!,
    action: "images_generated",
    entityType: "project",
    entityId: p.id,
    message: `Сгенерированы изображения`,
  });
  await returnProject(p, res);
});

router.post("/projects/:id/generate-audio", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }
  const scenes = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.projectId, p.id))
    .orderBy(asc(scenesTable.orderIndex));
  for (const s of scenes) {
    await db
      .update(scenesTable)
      .set({ audioUrl: SAMPLE_AUDIO_URL })
      .where(eq(scenesTable.id, s.id));
  }
  await db
    .update(projectsTable)
    .set({ status: "audio_ready", currentStep: Math.max(p.currentStep, 5) })
    .where(eq(projectsTable.id, p.id));
  await db.insert(auditLogTable).values({
    userId: req.userId!,
    action: "audio_generated",
    entityType: "project",
    entityId: p.id,
    message: `Сгенерирована озвучка`,
  });
  await returnProject(p, res);
});

router.post(
  "/projects/:id/cost-estimate",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const p = await ownProject(req);
    if (!p) {
      res.status(404).json({ error: "Проект не найден" });
      return;
    }
    const scenes = await loadProjectAndScenes(p);
    const quality = parseQuality(req.body?.quality);
    const removeWatermark = Boolean(req.body?.removeWatermark);
    const breakdown = computeProjectCost(p, scenes, { quality, removeWatermark });
    const balance = await getBalance(req.userId!);
    res.json({
      cost: serializeCost(breakdown),
      balance,
      sufficient: balance >= breakdown.total,
      missing: Math.max(0, breakdown.total - balance),
    });
  },
);

async function startRenderJob(opts: {
  req: AuthedRequest;
  res: import("express").Response;
  p: typeof projectsTable.$inferSelect;
  reason: "render" | "rerender";
  resetToAudioReady: boolean;
}) {
  const { req, res, p, reason, resetToAudioReady } = opts;
  if (p.status === "rendering") {
    res.status(409).json({ error: "Рендер уже выполняется" });
    return;
  }
  const scenes = await loadProjectAndScenes(p);
  const quality = parseQuality(req.body?.quality);
  const removeWatermark = Boolean(req.body?.removeWatermark);
  const breakdown = computeProjectCost(p, scenes, { quality, removeWatermark });

  const charge = await chargeTokens(req.userId!, breakdown.total, p.id, reason);
  if (!charge.ok) {
    res.status(402).json({
      error: `Не хватает ${breakdown.total - charge.balance} жетонов. Пополните баланс в разделе «Биллинг».`,
      cost: serializeCost(breakdown),
      balance: charge.balance,
      missing: breakdown.total - charge.balance,
    });
    return;
  }

  if (resetToAudioReady) {
    await db
      .update(projectsTable)
      .set({ status: "audio_ready", finalVideoUrl: null, errorMessage: null })
      .where(eq(projectsTable.id, p.id));
  }
  const [job] = await db
    .insert(renderJobsTable)
    .values({
      projectId: p.id,
      jobType: reason,
      status: "running",
      progress: 5,
      startedAt: new Date(),
    })
    .returning();
  await db
    .update(projectsTable)
    .set({ status: "rendering", currentStep: 6 })
    .where(eq(projectsTable.id, p.id));
  await db.insert(auditLogTable).values({
    userId: req.userId!,
    action: `${reason}_started`,
    entityType: "project",
    entityId: p.id,
    message: `Списано ${breakdown.total} жетонов за «${p.title}» (${breakdown.qualityLabel})`,
  });

  setTimeout(async () => {
    try {
      const [latest] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, p.id))
        .limit(1);
      if (!latest || latest.deletedAt) return;
      await db
        .update(renderJobsTable)
        .set({ status: "succeeded", progress: 100, finishedAt: new Date() })
        .where(eq(renderJobsTable.id, job!.id));
      await db
        .update(projectsTable)
        .set({ status: "done", finalVideoUrl: SAMPLE_VIDEO_URL, currentStep: 6 })
        .where(eq(projectsTable.id, p.id));
      await db.insert(auditLogTable).values({
        userId: latest.userId,
        action: `${reason}_done`,
        entityType: "project",
        entityId: p.id,
        message: `Видео «${latest.title}» готово`,
      });
    } catch (err) {
      try {
        await db
          .update(renderJobsTable)
          .set({
            status: "failed",
            finishedAt: new Date(),
            errorMessage: err instanceof Error ? err.message : "render failed",
          })
          .where(eq(renderJobsTable.id, job!.id));
        await db
          .update(projectsTable)
          .set({
            status: "failed",
            errorMessage: "Не удалось собрать видео. Жетоны возвращены на баланс.",
          })
          .where(eq(projectsTable.id, p.id));
        await refundTokens(
          req.userId!,
          breakdown.total,
          job!.id,
          `Возврат ${breakdown.total} жетонов: рендер «${p.title}» завершился с ошибкой`,
        );
      } catch {
        /* nothing else we can do here */
      }
    }
  }, 6000);

  await returnProject(p, res);
}

router.post("/projects/:id/render", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }
  await startRenderJob({ req, res, p, reason: "render", resetToAudioReady: false });
});

router.post("/projects/:id/rerender", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }
  await startRenderJob({ req, res, p, reason: "rerender", resetToAudioReady: true });
});

router.get("/projects/:id/progress", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }
  const [job] = await db
    .select()
    .from(renderJobsTable)
    .where(eq(renderJobsTable.projectId, p.id))
    .orderBy(sql`${renderJobsTable.createdAt} DESC`)
    .limit(1);

  let progress = 0;
  let stage = "Ожидание";
  let eta = 0;
  if (p.status === "done") {
    progress = 100;
    stage = "Готово";
  } else if (p.status === "rendering" && job) {
    const elapsed = (Date.now() - (job.startedAt?.getTime() ?? Date.now())) / 1000;
    progress = Math.min(95, Math.floor((elapsed / 6) * 100));
    stage = progress < 30 ? "Сборка кадров" : progress < 70 ? "Микширование звука" : "Финализация MP4";
    eta = Math.max(0, 6 - Math.floor(elapsed));
  } else if (p.status === "audio_ready") {
    stage = "Готов к рендеру";
  } else {
    stage = "В очереди";
    progress = 5;
  }
  res.json({
    projectId: p.id,
    status: p.status,
    currentStep: p.currentStep,
    progress,
    stageLabel: stage,
    etaSeconds: eta,
    queuePosition: 0,
  });
});

// === Генерация поста для соцсетей по готовому проекту ===
type SocialPlatform = "vk" | "telegram" | "youtube";

interface SocialCaption {
  platform: SocialPlatform;
  caption: string;
  hashtags: string[];
}

const HASHTAG_BANK: Record<string, string[]> = {
  marketing: ["маркетинг", "продвижение", "бизнес", "реклама", "продажи"],
  education: ["обучение", "знания", "развитие", "урок", "лайфхак"],
  content: ["контент", "интересное", "факты", "вдохновение", "история"],
  entertainment: ["развлечение", "видео", "смотрим", "тренды", "юмор"],
  educational: ["обучение", "знания", "развитие", "урок", "лайфхак"],
};

function pickEmoji(category: string | null): string[] {
  switch (category) {
    case "marketing":
      return ["🚀", "💼", "📈", "🔥", "💡"];
    case "education":
    case "educational":
      return ["📚", "🎓", "✏️", "💡", "🧠"];
    case "content":
      return ["✨", "🎬", "💭", "🌟", "👀"];
    case "entertainment":
      return ["🎉", "🎬", "🍿", "🤩", "🎵"];
    default:
      return ["✨", "🎬", "🚀", "💡", "🔥"];
  }
}

function transliterateForHashtag(s: string): string {
  // оставляем кириллицу + латиницу + цифры; пробелы = разделитель → CamelCase
  const cleaned = s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function buildCaptions(opts: {
  title: string;
  topic: string;
  category: string | null;
  durationSec: number;
  scenesCount: number;
}): SocialCaption[] {
  const { title, topic, category, durationSec, scenesCount } = opts;
  const emojis = pickEmoji(category);
  const baseTags = HASHTAG_BANK[category ?? "content"] ?? HASHTAG_BANK.content;
  const titleTag = transliterateForHashtag(title);
  const hashtags = [
    "#нейроклип",
    "#видео",
    ...baseTags.slice(0, 4).map((t) => `#${t}`),
    titleTag ? `#${titleTag}` : "",
  ].filter(Boolean);

  const shortTopic = topic.slice(0, 180).trim().replace(/\s+/g, " ");
  const longTopic = topic.slice(0, 380).trim().replace(/\s+/g, " ");

  // Человеко-читаемая длительность: «45 секунд», «1 минута», «3 минуты»
  const formatDuration = (s: number): string => {
    if (s < 60) return `${Math.max(1, Math.round(s))} секунд`;
    const mins = Math.round(s / 60);
    const lastDigit = mins % 10;
    const lastTwo = mins % 100;
    if (lastTwo >= 11 && lastTwo <= 14) return `${mins} минут`;
    if (lastDigit === 1) return `${mins} минуту`;
    if (lastDigit >= 2 && lastDigit <= 4) return `${mins} минуты`;
    return `${mins} минут`;
  };
  const durationLabel = formatDuration(durationSec);
  const ytDurationLabel = durationSec < 60 ? `за ${durationLabel}` : `за ${durationLabel}`;

  // ВКонтакте — средняя длина, эмодзи, призыв к лайкам
  const vkCaption =
    `${emojis[0]} ${title}\n\n` +
    `${longTopic}${longTopic.length < topic.length ? "…" : ""}\n\n` +
    `${emojis[1]} В видео — ${scenesCount} сцен, длительность ~${durationLabel}.\n` +
    `Смотрите до конца — самое интересное в финале!\n\n` +
    `${emojis[2]} Ставьте лайк, если было полезно, и сохраняйте, чтобы не потерять.`;

  // Telegram — лаконично, абзацами, без перегруза эмодзи
  const tgCaption =
    `${emojis[0]} **${title}**\n\n` +
    `${shortTopic}${shortTopic.length < topic.length ? "…" : ""}\n\n` +
    `Длительность: ${durationLabel} · ${scenesCount} сцен\n\n` +
    `Если зашло — поделитесь с другом ${emojis[3]}`;

  // YouTube Shorts — крючок + ключевые слова
  const ytCaption =
    `${emojis[4]} ${title} — ${ytDurationLabel}!\n\n` +
    `${shortTopic}${shortTopic.length < topic.length ? "…" : ""}\n\n` +
    `Подпишитесь, если хотите больше таких видео ${emojis[0]}`;

  return [
    { platform: "vk", caption: vkCaption, hashtags },
    { platform: "telegram", caption: tgCaption, hashtags: hashtags.slice(0, 5) },
    { platform: "youtube", caption: ytCaption, hashtags },
  ];
}

router.post("/projects/:id/social-caption", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }
  if (p.status !== "done") {
    res.status(400).json({ error: "Пост можно сгенерировать только для готового видео" });
    return;
  }
  const scenes = await loadProjectAndScenes(p);
  const captions = buildCaptions({
    title: p.title,
    topic: p.topicDescription,
    category: p.category,
    durationSec: p.durationSec ?? p.targetDurationSec,
    scenesCount: scenes.length,
  });
  res.json({ captions });
});

export default router;
