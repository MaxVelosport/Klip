import { Router, type IRouter } from "express";
import { randomBytes } from "node:crypto";
import { sbFrom, TABLE, type Project, type Scene } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../lib/session";

const router: IRouter = Router();

function generateShareToken(): string {
  return randomBytes(16).toString("hex");
}

export function serializeProject(p: Project, scenes: Scene[] = []) {
  return {
    id: p.id,
    title: p.title,
    topicDescription: p.topic_description,
    category: p.category,
    targetDurationSec: p.target_duration_sec,
    durationSec: p.duration_sec,
    visualStyle: p.visual_style,
    voiceId: p.voice_id,
    voiceSpeed: Number(p.voice_speed),
    backgroundMusicId: p.background_music_id,
    musicVolume: p.music_volume,
    addSubtitles: p.add_subtitles,
    status: p.status,
    currentStep: p.current_step,
    aspectRatio: p.aspect_ratio,
    shareToken: p.share_token,
    parentProjectId: p.parent_project_id,
    finalVideoUrl: p.final_video_url,
    thumbnailUrl: p.thumbnail_url,
    errorMessage: p.error_message,
    scenes: scenes.map(serializeScene),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export function serializeScene(s: Scene) {
  return {
    id: s.id,
    projectId: s.project_id,
    orderIndex: s.order_index,
    title: s.title,
    narration: s.narration,
    imagePrompt: s.image_prompt,
    imageUrl: s.image_url,
    audioUrl: s.audio_url,
    durationSec: Number(s.duration_sec),
    animationType: s.animation_type,
    transitionType: s.transition_type,
  };
}

router.get("/projects", requireAuth, async (req: AuthedRequest, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "all";
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  let query = sbFrom(TABLE.projects)
    .select("*")
    .eq("user_id", req.userId!)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (status && status !== "all") query = query.eq("status", status);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  const projectList = (rows ?? []) as Project[];
  const countMap = new Map<string, number>();
  if (projectList.length) {
    const ids = projectList.map((r) => r.id);
    const { data: sceneCounts } = await sbFrom(TABLE.scenes).select("project_id").in("project_id", ids);
    for (const s of (sceneCounts ?? []) as Array<{ project_id: string }>) {
      countMap.set(s.project_id, (countMap.get(s.project_id) ?? 0) + 1);
    }
  }

  res.json(
    projectList.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      currentStep: p.current_step,
      durationSec: p.duration_sec,
      aspectRatio: p.aspect_ratio,
      thumbnailUrl: p.thumbnail_url,
      finalVideoUrl: p.final_video_url,
      sceneCount: countMap.get(p.id) ?? 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
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
  const ratio = typeof aspectRatio === "string" && ALLOWED_RATIOS.has(aspectRatio) ? aspectRatio : "16:9";

  const { data: created, error } = await sbFrom(TABLE.projects).insert({
    user_id: req.userId!,
    title: String(title).trim(),
    topic_description: String(topicDescription),
    category: cat,
    target_duration_sec: Number(targetDurationSec),
    visual_style: String(visualStyle),
    voice_id: String(voiceId),
    background_music_id: backgroundMusicId ? String(backgroundMusicId) : null,
    add_subtitles: Boolean(addSubtitles),
    aspect_ratio: ratio,
    status: "draft",
    current_step: 1,
  }).select().single();
  if (error) throw new Error(error.message);

  await sbFrom(TABLE.auditLog).insert({
    user_id: req.userId!,
    action: "project_created",
    entity_type: "project",
    entity_id: created.id,
    message: `Создан проект «${created.title}»`,
  });
  res.json(serializeProject(created));
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadProjectOr404(req: AuthedRequest, res: import("express").Response): Promise<Project | null> {
  const id = String(req.params.id);
  if (!UUID_RE.test(id)) {
    res.status(404).json({ error: "Проект не найден" });
    return null;
  }
  const { data: p, error } = await sbFrom(TABLE.projects)
    .select("*")
    .eq("id", id)
    .eq("user_id", req.userId!)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!p) {
    res.status(404).json({ error: "Проект не найден" });
    return null;
  }
  return p as Project;
}

router.get("/projects/:id", requireAuth, async (req: AuthedRequest, res) => {
  const p = await loadProjectOr404(req, res);
  if (!p) return;
  const { data: scenes } = await sbFrom(TABLE.scenes)
    .select("*")
    .eq("project_id", p.id)
    .order("order_index", { ascending: true });
  res.json(serializeProject(p, (scenes ?? []) as Scene[]));
});

router.patch("/projects/:id", requireAuth, async (req: AuthedRequest, res) => {
  const p = await loadProjectOr404(req, res);
  if (!p) return;
  const b = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (typeof b.title === "string") updates.title = b.title.trim();
  if (typeof b.topicDescription === "string") updates.topic_description = b.topicDescription;
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
  if (typeof b.targetDurationSec === "number") updates.target_duration_sec = b.targetDurationSec;
  if (typeof b.visualStyle === "string") updates.visual_style = b.visualStyle;
  if (typeof b.voiceId === "string") updates.voice_id = b.voiceId;
  if (b.backgroundMusicId !== undefined) updates.background_music_id = b.backgroundMusicId;
  if (typeof b.addSubtitles === "boolean") updates.add_subtitles = b.addSubtitles;
  if (typeof b.currentStep === "number") updates.current_step = b.currentStep;
  if (typeof b.musicVolume === "number") updates.music_volume = b.musicVolume;
  if (typeof b.voiceSpeed === "number") updates.voice_speed = String(b.voiceSpeed);
  if (typeof b.aspectRatio === "string") {
    const ALLOWED_RATIOS = new Set(["16:9", "9:16", "1:1"]);
    if (!ALLOWED_RATIOS.has(b.aspectRatio)) {
      res.status(400).json({ error: "Недопустимое соотношение сторон" });
      return;
    }
    updates.aspect_ratio = b.aspectRatio;
  }
  if (Object.keys(updates).length) {
    const { error } = await sbFrom(TABLE.projects).update(updates).eq("id", p.id);
    if (error) throw new Error(error.message);
  }
  const { data: updated } = await sbFrom(TABLE.projects).select("*").eq("id", p.id).single();
  const { data: scenes } = await sbFrom(TABLE.scenes)
    .select("*")
    .eq("project_id", p.id)
    .order("order_index", { ascending: true });
  res.json(serializeProject(updated as Project, (scenes ?? []) as Scene[]));
});

router.delete("/projects/:id", requireAuth, async (req: AuthedRequest, res) => {
  const p = await loadProjectOr404(req, res);
  if (!p) return;
  const { error } = await sbFrom(TABLE.projects)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", p.id);
  if (error) throw new Error(error.message);
  await sbFrom(TABLE.auditLog).insert({
    user_id: req.userId!,
    action: "project_deleted",
    entity_type: "project",
    entity_id: p.id,
    message: `Удалён проект «${p.title}»`,
  });
  res.json({ ok: true });
});

router.post("/projects/:id/duplicate", requireAuth, async (req: AuthedRequest, res) => {
  const p = await loadProjectOr404(req, res);
  if (!p) return;
  const { data: copy, error: copyErr } = await sbFrom(TABLE.projects).insert({
    user_id: req.userId!,
    title: `${p.title} (копия)`,
    topic_description: p.topic_description,
    category: p.category,
    target_duration_sec: p.target_duration_sec,
    visual_style: p.visual_style,
    voice_id: p.voice_id,
    voice_speed: p.voice_speed,
    background_music_id: p.background_music_id,
    music_volume: p.music_volume,
    add_subtitles: p.add_subtitles,
    aspect_ratio: p.aspect_ratio,
    parent_project_id: p.id,
    status: p.status,
    current_step: p.current_step,
    duration_sec: p.duration_sec,
    thumbnail_url: p.thumbnail_url,
    final_video_url: p.final_video_url,
  }).select().single();
  if (copyErr) throw new Error(copyErr.message);

  const { data: sourceScenes } = await sbFrom(TABLE.scenes)
    .select("*")
    .eq("project_id", p.id)
    .order("order_index", { ascending: true });
  if (sourceScenes?.length) {
    const { error: insErr } = await sbFrom(TABLE.scenes).insert(
      (sourceScenes as Scene[]).map((s) => ({
        project_id: copy!.id,
        order_index: s.order_index,
        title: s.title,
        narration: s.narration,
        image_prompt: s.image_prompt,
        image_url: s.image_url,
        audio_url: s.audio_url,
        duration_sec: s.duration_sec,
        animation_type: s.animation_type,
        transition_type: s.transition_type,
      })),
    );
    if (insErr) throw new Error(insErr.message);
  }
  const { data: newScenes } = await sbFrom(TABLE.scenes)
    .select("*")
    .eq("project_id", copy!.id)
    .order("order_index", { ascending: true });
  res.json(serializeProject(copy as Project, (newScenes ?? []) as Scene[]));
});

router.post("/projects/:id/share", requireAuth, async (req: AuthedRequest, res) => {
  const p = await loadProjectOr404(req, res);
  if (!p) return;
  if (p.status !== "done" || !p.final_video_url) {
    res.status(400).json({ error: "Можно делиться только готовым видео" });
    return;
  }
  let token = p.share_token;
  if (!token) {
    token = generateShareToken();
    const { error } = await sbFrom(TABLE.projects).update({ share_token: token }).eq("id", p.id);
    if (error) throw new Error(error.message);
    await sbFrom(TABLE.auditLog).insert({
      user_id: req.userId!,
      action: "project_shared",
      entity_type: "project",
      entity_id: p.id,
      message: `Создана публичная ссылка для «${p.title}»`,
    });
  }
  res.json({ shareToken: token });
});

router.delete("/projects/:id/share", requireAuth, async (req: AuthedRequest, res) => {
  const p = await loadProjectOr404(req, res);
  if (!p) return;
  if (p.share_token) {
    const { error } = await sbFrom(TABLE.projects).update({ share_token: null }).eq("id", p.id);
    if (error) throw new Error(error.message);
    await sbFrom(TABLE.auditLog).insert({
      user_id: req.userId!,
      action: "project_share_revoked",
      entity_type: "project",
      entity_id: p.id,
      message: `Отозвана публичная ссылка «${p.title}»`,
    });
  }
  res.json({ ok: true });
});

router.get("/share/:token", async (req, res) => {
  const token = String(req.params.token ?? "").trim();
  if (!/^[a-f0-9]{32}$/i.test(token)) {
    res.status(404).json({ error: "Ссылка не найдена" });
    return;
  }
  const { data: p, error } = await sbFrom(TABLE.projects)
    .select("*")
    .eq("share_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!p || p.status !== "done" || !p.final_video_url) {
    res.status(404).json({ error: "Ссылка не найдена или видео ещё не готово" });
    return;
  }
  const { data: scenes } = await sbFrom(TABLE.scenes)
    .select("*")
    .eq("project_id", p.id)
    .order("order_index", { ascending: true });
  res.json({
    title: p.title,
    durationSec: p.duration_sec,
    aspectRatio: p.aspect_ratio,
    finalVideoUrl: p.final_video_url,
    thumbnailUrl: p.thumbnail_url,
    scenes: ((scenes ?? []) as Scene[]).map((s) => ({
      orderIndex: s.order_index,
      title: s.title,
      narration: s.narration,
      durationSec: Number(s.duration_sec),
    })),
  });
});

export default router;
