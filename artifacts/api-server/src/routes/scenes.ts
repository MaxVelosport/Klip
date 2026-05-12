import { Router, type IRouter } from "express";
import { sbFrom, TABLE } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../lib/session";
import { serializeScene } from "./projects";
import { pickImage } from "../lib/mock-content";

const router: IRouter = Router();

async function ownProject(req: AuthedRequest) {
  const id = String(req.params.id);
  const { data: p } = await sbFrom(TABLE.projects)
    .select("*")
    .eq("id", id)
    .eq("user_id", req.userId!)
    .is("deleted_at", null)
    .maybeSingle();
  return p ?? null;
}

router.post("/projects/:id/scenes", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }
  const { title, narration, imagePrompt } = req.body ?? {};
  const { data: existing, error: cntErr } = await sbFrom(TABLE.scenes).select("id").eq("project_id", p.id);
  if (cntErr) throw new Error(cntErr.message);
  const orderIndex = existing?.length ?? 0;

  const { data: s, error } = await sbFrom(TABLE.scenes).insert({
    project_id: p.id,
    order_index: orderIndex,
    title: title ?? "Новая сцена",
    narration: narration ?? "",
    image_prompt: imagePrompt ?? "",
    duration_sec: "6.00",
  }).select().single();
  if (error) throw new Error(error.message);
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
  const updates: Record<string, unknown> = {};
  if (typeof b.title === "string") updates.title = b.title;
  if (typeof b.narration === "string") updates.narration = b.narration;
  if (typeof b.imagePrompt === "string") updates.image_prompt = b.imagePrompt;
  if (b.imageUrl !== undefined) updates.image_url = b.imageUrl;
  if (typeof b.animationType === "string") updates.animation_type = b.animationType;
  if (typeof b.transitionType === "string") updates.transition_type = b.transitionType;
  if (typeof b.durationSec === "number") updates.duration_sec = String(b.durationSec);
  if (typeof b.orderIndex === "number") updates.order_index = b.orderIndex;

  if (Object.keys(updates).length) {
    const { error } = await sbFrom(TABLE.scenes)
      .update(updates)
      .eq("id", sceneId)
      .eq("project_id", p.id);
    if (error) throw new Error(error.message);
  }
  const { data: s } = await sbFrom(TABLE.scenes)
    .select("*")
    .eq("id", sceneId)
    .eq("project_id", p.id)
    .maybeSingle();
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
  const { error: delErr } = await sbFrom(TABLE.scenes)
    .delete()
    .eq("id", sceneId)
    .eq("project_id", p.id);
  if (delErr) throw new Error(delErr.message);

  const { data: remaining } = await sbFrom(TABLE.scenes)
    .select("*")
    .eq("project_id", p.id)
    .order("order_index", { ascending: true });
  for (let i = 0; i < (remaining ?? []).length; i++) {
    if ((remaining![i] as any).order_index !== i) {
      await sbFrom(TABLE.scenes).update({ order_index: i }).eq("id", (remaining![i] as any).id);
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
  const { data: existing } = await sbFrom(TABLE.scenes).select("*").eq("project_id", p.id);
  if ((existing ?? []).length !== ids.length) {
    res.status(400).json({ error: "Передайте все сцены проекта в нужном порядке (без пропусков)" });
    return;
  }
  const existingIds = new Set((existing ?? []).map((s: any) => s.id));
  for (const id of ids) {
    if (!existingIds.has(id)) {
      res.status(400).json({ error: "Среди переданных ids есть чужие сцены" });
      return;
    }
  }
  for (let i = 0; i < ids.length; i++) {
    await sbFrom(TABLE.scenes).update({ order_index: i }).eq("id", ids[i]!).eq("project_id", p.id);
  }
  const { data: list } = await sbFrom(TABLE.scenes)
    .select("*")
    .eq("project_id", p.id)
    .order("order_index", { ascending: true });
  res.json({ scenes: (list ?? []).map(serializeScene) });
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
    const { data: scenes } = await sbFrom(TABLE.scenes)
      .select("*")
      .eq("project_id", p.id)
      .order("order_index", { ascending: true });
    for (const s of scenes ?? []) {
      const seed = `${(s as any).id}:${Date.now()}:${Math.random()}`;
      await sbFrom(TABLE.scenes)
        .update({ image_url: pickImage(seed, (s as any).order_index) })
        .eq("id", (s as any).id);
    }
    const { data: list } = await sbFrom(TABLE.scenes)
      .select("*")
      .eq("project_id", p.id)
      .order("order_index", { ascending: true });
    res.json({ scenes: (list ?? []).map(serializeScene) });
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
    const { data: existing } = await sbFrom(TABLE.scenes)
      .select("*")
      .eq("id", sceneId)
      .eq("project_id", p.id)
      .maybeSingle();
    if (!existing) {
      res.status(404).json({ error: "Сцена не найдена" });
      return;
    }
    const seed = `${(existing as any).id}:${Date.now()}`;
    await sbFrom(TABLE.scenes)
      .update({ image_url: pickImage(seed, (existing as any).order_index) })
      .eq("id", sceneId);
    const { data: s } = await sbFrom(TABLE.scenes).select("*").eq("id", sceneId).single();
    res.json(serializeScene(s!));
  },
);

export default router;
