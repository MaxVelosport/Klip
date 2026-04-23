import { Router, type IRouter } from "express";
import { randomBytes } from "node:crypto";
import {
  db,
  projectsTable,
  scenesTable,
  auditLogTable,
} from "@workspace/db";
import { and, eq, isNull, asc, desc, ilike, sql } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../lib/session";

const router: IRouter = Router();

function generateShareToken(): string {
  // 32 hex chars (~128 bits) — устойчиво к перебору; URL-safe
  return randomBytes(16).toString("hex");
}

function serializeProject(p: typeof projectsTable.$inferSelect, scenes: (typeof scenesTable.$inferSelect)[] = []) {
  return {
    id: p.id,
    title: p.title,
    topicDescription: p.topicDescription,
    category: p.category,
    targetDurationSec: p.targetDurationSec,
    durationSec: p.durationSec,
    visualStyle: p.visualStyle,
    voiceId: p.voiceId,
    voiceSpeed: Number(p.voiceSpeed),
    backgroundMusicId: p.backgroundMusicId,
    musicVolume: p.musicVolume,
    addSubtitles: p.addSubtitles,
    status: p.status,
    currentStep: p.currentStep,
    aspectRatio: p.aspectRatio,
    shareToken: p.shareToken,
    parentProjectId: p.parentProjectId,
    finalVideoUrl: p.finalVideoUrl,
    thumbnailUrl: p.thumbnailUrl,
    errorMessage: p.errorMessage,
    scenes: scenes.map(serializeScene),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serializeScene(s: typeof scenesTable.$inferSelect) {
  return {
    id: s.id,
    projectId: s.projectId,
    orderIndex: s.orderIndex,
    title: s.title,
    narration: s.narration,
    imagePrompt: s.imagePrompt,
    imageUrl: s.imageUrl,
    audioUrl: s.audioUrl,
    durationSec: Number(s.durationSec),
    animationType: s.animationType,
    transitionType: s.transitionType,
  };
}

router.get("/projects", requireAuth, async (req: AuthedRequest, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "all";
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const conds = [eq(projectsTable.userId, req.userId!), isNull(projectsTable.deletedAt)];
  if (status && status !== "all") conds.push(eq(projectsTable.status, status));
  if (search) conds.push(ilike(projectsTable.title, `%${search}%`));
  const rows = await db
    .select()
    .from(projectsTable)
    .where(and(...conds))
    .orderBy(desc(projectsTable.updatedAt))
    .limit(200);
  const ids = rows.map((r) => r.id);
  let counts = new Map<string, number>();
  if (ids.length) {
    const c = await db
      .select({ projectId: scenesTable.projectId, count: sql<number>`count(*)::int` })
      .from(scenesTable)
      .where(sql`${scenesTable.projectId} = ANY(${ids})`)
      .groupBy(scenesTable.projectId);
    counts = new Map(c.map((x) => [x.projectId, Number(x.count)]));
  }
  res.json(
    rows.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      currentStep: p.currentStep,
      durationSec: p.durationSec,
      aspectRatio: p.aspectRatio,
      thumbnailUrl: p.thumbnailUrl,
      finalVideoUrl: p.finalVideoUrl,
      sceneCount: counts.get(p.id) ?? 0,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  );
});

router.post("/projects", requireAuth, async (req: AuthedRequest, res) => {
  const {
    title,
    topicDescription,
    targetDurationSec,
    visualStyle,
    voiceId,
    backgroundMusicId,
    addSubtitles,
    category,
    aspectRatio,
  } = req.body ?? {};
  if (!title || !topicDescription || !targetDurationSec || !visualStyle || !voiceId) {
    res.status(400).json({ error: "Заполните все обязательные поля проекта" });
    return;
  }
  const ALLOWED_CATEGORIES = new Set([
    "educational", "historical", "content", "marketing", "news",
    "story", "vlog", "howto", "kids", "business",
  ]);
  const cat = typeof category === "string" && ALLOWED_CATEGORIES.has(category) ? category : "educational";
  const ALLOWED_RATIOS = new Set(["16:9", "9:16", "1:1"]);
  const ratio =
    typeof aspectRatio === "string" && ALLOWED_RATIOS.has(aspectRatio) ? aspectRatio : "16:9";
  const [created] = await db
    .insert(projectsTable)
    .values({
      userId: req.userId!,
      title: String(title).trim(),
      topicDescription: String(topicDescription),
      category: cat,
      targetDurationSec: Number(targetDurationSec),
      visualStyle: String(visualStyle),
      voiceId: String(voiceId),
      backgroundMusicId: backgroundMusicId ? String(backgroundMusicId) : null,
      addSubtitles: Boolean(addSubtitles),
      aspectRatio: ratio,
      status: "draft",
      currentStep: 1,
    })
    .returning();
  await db.insert(auditLogTable).values({
    userId: req.userId!,
    action: "project_created",
    entityType: "project",
    entityId: created!.id,
    message: `Создан проект «${created!.title}»`,
  });
  res.json(serializeProject(created!));
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadProjectOr404(req: AuthedRequest, res: import("express").Response) {
  const id = String(req.params.id);
  // Защита от 500: некорректный UUID никогда не существует — сразу 404.
  if (!UUID_RE.test(id)) {
    res.status(404).json({ error: "Проект не найден" });
    return null;
  }
  const [p] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, req.userId!), isNull(projectsTable.deletedAt)))
    .limit(1);
  if (!p) {
    res.status(404).json({ error: "Проект не найден" });
    return null;
  }
  return p;
}

router.get("/projects/:id", requireAuth, async (req: AuthedRequest, res) => {
  const p = await loadProjectOr404(req, res);
  if (!p) return;
  const scenes = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.projectId, p.id))
    .orderBy(asc(scenesTable.orderIndex));
  res.json(serializeProject(p, scenes));
});

router.patch("/projects/:id", requireAuth, async (req: AuthedRequest, res) => {
  const p = await loadProjectOr404(req, res);
  if (!p) return;
  const b = req.body ?? {};
  const updates: Partial<typeof projectsTable.$inferInsert> = {};
  if (typeof b.title === "string") updates.title = b.title.trim();
  if (typeof b.topicDescription === "string") updates.topicDescription = b.topicDescription;
  if (typeof b.category === "string") {
    const ALLOWED = new Set([
      "educational", "historical", "content", "marketing", "news",
      "story", "vlog", "howto", "kids", "business",
    ]);
    if (!ALLOWED.has(b.category)) {
      res.status(400).json({ error: "Недопустимая категория" });
      return;
    }
    updates.category = b.category;
  }
  if (typeof b.targetDurationSec === "number") updates.targetDurationSec = b.targetDurationSec;
  if (typeof b.visualStyle === "string") updates.visualStyle = b.visualStyle;
  if (typeof b.voiceId === "string") updates.voiceId = b.voiceId;
  if (b.backgroundMusicId !== undefined) updates.backgroundMusicId = b.backgroundMusicId;
  if (typeof b.addSubtitles === "boolean") updates.addSubtitles = b.addSubtitles;
  if (typeof b.currentStep === "number") updates.currentStep = b.currentStep;
  if (typeof b.musicVolume === "number") updates.musicVolume = b.musicVolume;
  if (typeof b.voiceSpeed === "number") updates.voiceSpeed = String(b.voiceSpeed);
  if (typeof b.aspectRatio === "string") {
    const ALLOWED_RATIOS = new Set(["16:9", "9:16", "1:1"]);
    if (!ALLOWED_RATIOS.has(b.aspectRatio)) {
      res.status(400).json({ error: "Недопустимое соотношение сторон" });
      return;
    }
    updates.aspectRatio = b.aspectRatio;
  }
  if (Object.keys(updates).length) {
    await db.update(projectsTable).set(updates).where(eq(projectsTable.id, p.id));
  }
  const [updated] = await db.select().from(projectsTable).where(eq(projectsTable.id, p.id)).limit(1);
  const scenes = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.projectId, p.id))
    .orderBy(asc(scenesTable.orderIndex));
  res.json(serializeProject(updated!, scenes));
});

router.delete("/projects/:id", requireAuth, async (req: AuthedRequest, res) => {
  const p = await loadProjectOr404(req, res);
  if (!p) return;
  await db
    .update(projectsTable)
    .set({ deletedAt: new Date() })
    .where(eq(projectsTable.id, p.id));
  await db.insert(auditLogTable).values({
    userId: req.userId!,
    action: "project_deleted",
    entityType: "project",
    entityId: p.id,
    message: `Удалён проект «${p.title}»`,
  });
  res.json({ ok: true });
});

router.post("/projects/:id/duplicate", requireAuth, async (req: AuthedRequest, res) => {
  const p = await loadProjectOr404(req, res);
  if (!p) return;
  const [copy] = await db
    .insert(projectsTable)
    .values({
      userId: req.userId!,
      title: `${p.title} (копия)`,
      topicDescription: p.topicDescription,
      category: p.category,
      targetDurationSec: p.targetDurationSec,
      visualStyle: p.visualStyle,
      voiceId: p.voiceId,
      voiceSpeed: p.voiceSpeed,
      backgroundMusicId: p.backgroundMusicId,
      musicVolume: p.musicVolume,
      addSubtitles: p.addSubtitles,
      aspectRatio: p.aspectRatio,
      parentProjectId: p.id,
      status: p.status,
      currentStep: p.currentStep,
      durationSec: p.durationSec,
      thumbnailUrl: p.thumbnailUrl,
      finalVideoUrl: p.finalVideoUrl,
    })
    .returning();
  const sourceScenes = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.projectId, p.id))
    .orderBy(asc(scenesTable.orderIndex));
  if (sourceScenes.length) {
    await db.insert(scenesTable).values(
      sourceScenes.map((s) => ({
        projectId: copy!.id,
        orderIndex: s.orderIndex,
        title: s.title,
        narration: s.narration,
        imagePrompt: s.imagePrompt,
        imageUrl: s.imageUrl,
        audioUrl: s.audioUrl,
        durationSec: s.durationSec,
        animationType: s.animationType,
        transitionType: s.transitionType,
      })),
    );
  }
  const newScenes = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.projectId, copy!.id))
    .orderBy(asc(scenesTable.orderIndex));
  res.json(serializeProject(copy!, newScenes));
});

router.post("/projects/:id/share", requireAuth, async (req: AuthedRequest, res) => {
  const p = await loadProjectOr404(req, res);
  if (!p) return;
  // Шарить можно только готовое видео — иначе зрителю нечего показать
  if (p.status !== "done" || !p.finalVideoUrl) {
    res.status(400).json({ error: "Можно делиться только готовым видео" });
    return;
  }
  let token = p.shareToken;
  if (!token) {
    token = generateShareToken();
    await db
      .update(projectsTable)
      .set({ shareToken: token })
      .where(eq(projectsTable.id, p.id));
    await db.insert(auditLogTable).values({
      userId: req.userId!,
      action: "project_shared",
      entityType: "project",
      entityId: p.id,
      message: `Создана публичная ссылка для «${p.title}»`,
    });
  }
  res.json({ shareToken: token });
});

router.delete("/projects/:id/share", requireAuth, async (req: AuthedRequest, res) => {
  const p = await loadProjectOr404(req, res);
  if (!p) return;
  if (p.shareToken) {
    await db
      .update(projectsTable)
      .set({ shareToken: null })
      .where(eq(projectsTable.id, p.id));
    await db.insert(auditLogTable).values({
      userId: req.userId!,
      action: "project_share_revoked",
      entityType: "project",
      entityId: p.id,
      message: `Отозвана публичная ссылка «${p.title}»`,
    });
  }
  res.json({ ok: true });
});

// Публичный эндпоинт — без requireAuth. Возвращает только безопасные поля.
router.get("/share/:token", async (req, res) => {
  const token = String(req.params.token ?? "").trim();
  // Валидация: 32 hex-символа. Защита от случайных запросов и SQL-сюрпризов.
  if (!/^[a-f0-9]{32}$/i.test(token)) {
    res.status(404).json({ error: "Ссылка не найдена" });
    return;
  }
  const [p] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.shareToken, token), isNull(projectsTable.deletedAt)))
    .limit(1);
  if (!p || p.status !== "done" || !p.finalVideoUrl) {
    res.status(404).json({ error: "Ссылка не найдена или видео ещё не готово" });
    return;
  }
  const scenes = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.projectId, p.id))
    .orderBy(asc(scenesTable.orderIndex));
  // Возвращаем минимальный набор — только то, что нужно публичной странице.
  res.json({
    title: p.title,
    durationSec: p.durationSec,
    aspectRatio: p.aspectRatio,
    finalVideoUrl: p.finalVideoUrl,
    thumbnailUrl: p.thumbnailUrl,
    scenes: scenes.map((s) => ({
      orderIndex: s.orderIndex,
      title: s.title,
      narration: s.narration,
      durationSec: Number(s.durationSec),
    })),
  });
});

export default router;
