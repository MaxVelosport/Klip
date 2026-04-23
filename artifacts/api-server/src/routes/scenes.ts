import { Router, type IRouter } from "express";
import { db, projectsTable, scenesTable } from "@workspace/db";
import { and, eq, isNull, asc, sql } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../lib/session";
import { serializeScene } from "./projects";
import { pickImage } from "../lib/mock-content";

const router: IRouter = Router();

async function ownProject(req: AuthedRequest) {
  const id = String(req.params.id);
  const [p] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, req.userId!), isNull(projectsTable.deletedAt)))
    .limit(1);
  return p ?? null;
}

router.post("/projects/:id/scenes", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }
  const { title, narration, imagePrompt } = req.body ?? {};
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scenesTable)
    .where(eq(scenesTable.projectId, p.id));
  const [s] = await db
    .insert(scenesTable)
    .values({
      projectId: p.id,
      orderIndex: Number(count) || 0,
      title: title ?? "Новая сцена",
      narration: narration ?? "",
      imagePrompt: imagePrompt ?? "",
      durationSec: "6.00",
    })
    .returning();
  res.json(serializeScene(s!));
});

router.patch("/projects/:id/scenes/:sceneId", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }
  const sceneId = String(req.params.sceneId);
  const b = req.body ?? {};
  const updates: Partial<typeof scenesTable.$inferInsert> = {};
  if (typeof b.title === "string") updates.title = b.title;
  if (typeof b.narration === "string") updates.narration = b.narration;
  if (typeof b.imagePrompt === "string") updates.imagePrompt = b.imagePrompt;
  if (b.imageUrl !== undefined) updates.imageUrl = b.imageUrl;
  if (typeof b.animationType === "string") updates.animationType = b.animationType;
  if (typeof b.transitionType === "string") updates.transitionType = b.transitionType;
  if (typeof b.durationSec === "number") updates.durationSec = String(b.durationSec);
  if (typeof b.orderIndex === "number") updates.orderIndex = b.orderIndex;
  if (Object.keys(updates).length) {
    await db
      .update(scenesTable)
      .set(updates)
      .where(and(eq(scenesTable.id, sceneId), eq(scenesTable.projectId, p.id)));
  }
  const [s] = await db
    .select()
    .from(scenesTable)
    .where(and(eq(scenesTable.id, sceneId), eq(scenesTable.projectId, p.id)))
    .limit(1);
  if (!s) {
    res.status(404).json({ error: "Сцена не найдена" });
    return;
  }
  res.json(serializeScene(s));
});

router.delete("/projects/:id/scenes/:sceneId", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }
  const sceneId = String(req.params.sceneId);
  await db
    .delete(scenesTable)
    .where(and(eq(scenesTable.id, sceneId), eq(scenesTable.projectId, p.id)));
  // re-pack order indexes
  const remaining = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.projectId, p.id))
    .orderBy(asc(scenesTable.orderIndex));
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i]!.orderIndex !== i) {
      await db.update(scenesTable).set({ orderIndex: i }).where(eq(scenesTable.id, remaining[i]!.id));
    }
  }
  res.json({ ok: true });
});

router.post("/projects/:id/scenes/reorder", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }
  const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]).map(String) : [];
  if (ids.length === 0) {
    res.status(400).json({ error: "Передайте ids — массив идентификаторов сцен" });
    return;
  }
  if (new Set(ids).size !== ids.length) {
    res.status(400).json({ error: "В ids есть дубликаты" });
    return;
  }
  const existing = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.projectId, p.id));
  if (existing.length !== ids.length) {
    res
      .status(400)
      .json({ error: "Передайте все сцены проекта в нужном порядке (без пропусков)" });
    return;
  }
  const existingIds = new Set(existing.map((s) => s.id));
  for (const id of ids) {
    if (!existingIds.has(id)) {
      res.status(400).json({ error: "Среди переданных ids есть чужие сцены" });
      return;
    }
  }
  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx
        .update(scenesTable)
        .set({ orderIndex: i })
        .where(and(eq(scenesTable.id, ids[i]!), eq(scenesTable.projectId, p.id)));
    }
  });
  const list = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.projectId, p.id))
    .orderBy(asc(scenesTable.orderIndex));
  res.json({ scenes: list.map(serializeScene) });
});

router.post(
  "/projects/:id/scenes/regenerate-all-images",
  requireAuth,
  async (req: AuthedRequest, res) => {
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
    await db.transaction(async (tx) => {
      for (const s of scenes) {
        const seed = `${s.id}:${Date.now()}:${Math.random()}`;
        await tx
          .update(scenesTable)
          .set({ imageUrl: pickImage(seed, s.orderIndex) })
          .where(eq(scenesTable.id, s.id));
      }
    });
    const list = await db
      .select()
      .from(scenesTable)
      .where(eq(scenesTable.projectId, p.id))
      .orderBy(asc(scenesTable.orderIndex));
    res.json({ scenes: list.map(serializeScene) });
  },
);

router.post(
  "/projects/:id/scenes/:sceneId/regenerate-image",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const p = await ownProject(req);
    if (!p) {
      res.status(404).json({ error: "Проект не найден" });
      return;
    }
    const sceneId = String(req.params.sceneId);
    const [existing] = await db
      .select()
      .from(scenesTable)
      .where(and(eq(scenesTable.id, sceneId), eq(scenesTable.projectId, p.id)))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Сцена не найдена" });
      return;
    }
    const seed = `${existing.id}:${Date.now()}`;
    await db
      .update(scenesTable)
      .set({ imageUrl: pickImage(seed, existing.orderIndex) })
      .where(eq(scenesTable.id, sceneId));
    const [s] = await db.select().from(scenesTable).where(eq(scenesTable.id, sceneId)).limit(1);
    res.json(serializeScene(s!));
  },
);

export default router;
