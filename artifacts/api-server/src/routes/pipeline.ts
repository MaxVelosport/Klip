import { Router, type IRouter } from "express";
import { sbFrom, sbRpc, TABLE } from "@workspace/db";
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
  const { data } = await sbFrom(TABLE.tokenBalances).select("balance").eq("user_id", userId).maybeSingle();
  return (data as any)?.balance ?? 0;
}

async function chargeTokens(
  userId: string,
  amount: number,
  projectId: string,
  reason: string,
): Promise<{ ok: true; balanceAfter: number } | { ok: false; balance: number }> {
  const { data, error } = await sbRpc("neyroclip_spend_tokens", {
    p_user_id: userId,
    p_amount: amount,
    p_ref_id: projectId,
    p_reason: reason,
  });
  if (error) {
    if (error.message?.includes("INSUFFICIENT_TOKENS")) {
      const balance = await getBalance(userId);
      return { ok: false as const, balance };
    }
    throw new Error(error.message);
  }
  return { ok: true as const, balanceAfter: (data as any).new_balance };
}

async function refundTokens(userId: string, amount: number, jobId: string, note: string) {
  const { error } = await sbRpc("neyroclip_refund_tokens", {
    p_user_id: userId,
    p_amount: amount,
    p_ref_id: jobId,
    p_reason: "refund",
  });
  if (error && !error.message?.includes("USER_NOT_FOUND")) {
    // best-effort: log but don't throw inside setTimeout
    console.error(`refundTokens error for job ${jobId}:`, error.message);
    return;
  }
  await sbFrom(TABLE.auditLog).insert({
    user_id: userId,
    action: "render_refund",
    entity_type: "render_job",
    entity_id: jobId,
    message: note,
  });
}

async function loadScenes(projectId: string) {
  const { data } = await sbFrom(TABLE.scenes)
    .select("*")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });
  return (data ?? []) as any[];
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
  const { data: p } = await sbFrom(TABLE.projects)
    .select("*")
    .eq("id", id)
    .eq("user_id", req.userId!)
    .is("deleted_at", null)
    .maybeSingle();
  return (p as any) ?? null;
}

async function returnProject(p: any, res: import("express").Response) {
  const { data: updated } = await sbFrom(TABLE.projects).select("*").eq("id", p.id).single();
  const scenes = await loadScenes(p.id);
  const u = updated as any;
  res.json({
    id: u.id,
    title: u.title,
    topicDescription: u.topic_description,
    category: u.category,
    targetDurationSec: u.target_duration_sec,
    durationSec: u.duration_sec,
    visualStyle: u.visual_style,
    voiceId: u.voice_id,
    voiceSpeed: Number(u.voice_speed),
    backgroundMusicId: u.background_music_id,
    musicVolume: u.music_volume,
    addSubtitles: u.add_subtitles,
    status: u.status,
    currentStep: u.current_step,
    finalVideoUrl: u.final_video_url,
    thumbnailUrl: u.thumbnail_url,
    errorMessage: u.error_message,
    scenes: scenes.map(serializeScene),
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  });
}

router.post("/projects/:id/generate-script", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) { res.status(404).json({ error: "Проект не найден" }); return; }

  await sbFrom(TABLE.scenes).delete().eq("project_id", p.id);

  const generated = generateScript(
    p.topic_description,
    p.target_duration_sec,
    p.visual_style,
    (p.category ?? "educational") as Parameters<typeof generateScript>[3],
  );
  let totalDuration = 0;
  for (let i = 0; i < generated.length; i++) {
    const s = generated[i]!;
    totalDuration += s.durationSec;
    await sbFrom(TABLE.scenes).insert({
      project_id: p.id,
      order_index: i,
      title: s.title,
      narration: s.narration,
      image_prompt: s.imagePrompt,
      duration_sec: String(s.durationSec),
    });
  }
  await sbFrom(TABLE.projects).update({
    status: "script_ready",
    duration_sec: totalDuration,
    current_step: Math.max(p.current_step, 2),
  }).eq("id", p.id);
  await sbFrom(TABLE.auditLog).insert({
    user_id: req.userId!,
    action: "script_generated",
    entity_type: "project",
    entity_id: p.id,
    message: `Сгенерирован сценарий (${generated.length} сцен)`,
  });
  await returnProject(p, res);
});

router.post("/projects/:id/generate-images", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) { res.status(404).json({ error: "Проект не найден" }); return; }

  const scenes = await loadScenes(p.id);
  for (const s of scenes) {
    await sbFrom(TABLE.scenes).update({ image_url: pickImage(s.id, s.order_index) }).eq("id", s.id);
  }
  const thumb = scenes[0] ? pickImage(scenes[0].id, 0) : null;
  await sbFrom(TABLE.projects).update({
    status: "images_ready",
    thumbnail_url: thumb,
    current_step: Math.max(p.current_step, 3),
  }).eq("id", p.id);
  await sbFrom(TABLE.auditLog).insert({
    user_id: req.userId!,
    action: "images_generated",
    entity_type: "project",
    entity_id: p.id,
    message: `Сгенерированы изображения`,
  });
  await returnProject(p, res);
});

router.post("/projects/:id/generate-audio", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) { res.status(404).json({ error: "Проект не найден" }); return; }

  const scenes = await loadScenes(p.id);
  for (const s of scenes) {
    await sbFrom(TABLE.scenes).update({ audio_url: SAMPLE_AUDIO_URL }).eq("id", s.id);
  }
  await sbFrom(TABLE.projects).update({
    status: "audio_ready",
    current_step: Math.max(p.current_step, 5),
  }).eq("id", p.id);
  await sbFrom(TABLE.auditLog).insert({
    user_id: req.userId!,
    action: "audio_generated",
    entity_type: "project",
    entity_id: p.id,
    message: `Сгенерирована озвучка`,
  });
  await returnProject(p, res);
});

router.post("/projects/:id/cost-estimate", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) { res.status(404).json({ error: "Проект не найден" }); return; }

  const scenes = await loadScenes(p.id);
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
});

async function startRenderJob(opts: {
  req: AuthedRequest;
  res: import("express").Response;
  p: any;
  reason: "render" | "rerender";
  resetToAudioReady: boolean;
}) {
  const { req, res, p, reason, resetToAudioReady } = opts;
  if (p.status === "rendering") {
    res.status(409).json({ error: "Рендер уже выполняется" });
    return;
  }
  const scenes = await loadScenes(p.id);
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
    await sbFrom(TABLE.projects).update({
      status: "audio_ready",
      final_video_url: null,
      error_message: null,
    }).eq("id", p.id);
  }
  const { data: job, error: jobErr } = await sbFrom(TABLE.renderJobs).insert({
    project_id: p.id,
    job_type: reason,
    status: "running",
    progress: 5,
    started_at: new Date().toISOString(),
  }).select().single();
  if (jobErr) throw new Error(jobErr.message);

  await sbFrom(TABLE.projects).update({ status: "rendering", current_step: 6 }).eq("id", p.id);
  await sbFrom(TABLE.auditLog).insert({
    user_id: req.userId!,
    action: `${reason}_started`,
    entity_type: "project",
    entity_id: p.id,
    message: `Списано ${breakdown.total} жетонов за «${p.title}» (${breakdown.qualityLabel})`,
  });

  const jobId = (job as any).id;
  const userId = req.userId!;

  setTimeout(async () => {
    try {
      const { data: latest } = await sbFrom(TABLE.projects).select("*").eq("id", p.id).maybeSingle();
      if (!latest || (latest as any).deleted_at) return;
      await sbFrom(TABLE.renderJobs).update({
        status: "succeeded",
        progress: 100,
        finished_at: new Date().toISOString(),
      }).eq("id", jobId);
      await sbFrom(TABLE.projects).update({
        status: "done",
        final_video_url: SAMPLE_VIDEO_URL,
        current_step: 6,
      }).eq("id", p.id);
      await sbFrom(TABLE.auditLog).insert({
        user_id: (latest as any).user_id,
        action: `${reason}_done`,
        entity_type: "project",
        entity_id: p.id,
        message: `Видео «${(latest as any).title}» готово`,
      });
    } catch (err) {
      try {
        await sbFrom(TABLE.renderJobs).update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: err instanceof Error ? err.message : "render failed",
        }).eq("id", jobId);
        await sbFrom(TABLE.projects).update({
          status: "failed",
          error_message: "Не удалось собрать видео. Жетоны возвращены на баланс.",
        }).eq("id", p.id);
        await refundTokens(
          userId,
          breakdown.total,
          jobId,
          `Возврат ${breakdown.total} жетонов: рендер «${p.title}» завершился с ошибкой`,
        );
      } catch {
        /* nothing else we can do */
      }
    }
  }, 6000);

  await returnProject(p, res);
}

router.post("/projects/:id/render", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) { res.status(404).json({ error: "Проект не найден" }); return; }
  await startRenderJob({ req, res, p, reason: "render", resetToAudioReady: false });
});

router.post("/projects/:id/rerender", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) { res.status(404).json({ error: "Проект не найден" }); return; }
  await startRenderJob({ req, res, p, reason: "rerender", resetToAudioReady: true });
});

router.get("/projects/:id/progress", requireAuth, async (req: AuthedRequest, res) => {
  const p = await ownProject(req);
  if (!p) { res.status(404).json({ error: "Проект не найден" }); return; }

  const { data: job } = await sbFrom(TABLE.renderJobs)
    .select("*")
    .eq("project_id", p.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const j = job as any;

  let progress = 0;
  let stage = "Ожидание";
  let eta = 0;
  if (p.status === "done") {
    progress = 100;
    stage = "Готово";
  } else if (p.status === "rendering" && j) {
    const elapsed = (Date.now() - (j.started_at ? new Date(j.started_at).getTime() : Date.now())) / 1000;
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
    currentStep: p.current_step,
    progress,
    stageLabel: stage,
    etaSeconds: eta,
    queuePosition: 0,
  });
});

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
    case "marketing": return ["🚀", "💼", "📈", "🔥", "💡"];
    case "education":
    case "educational": return ["📚", "🎓", "✏️", "💡", "🧠"];
    case "content": return ["✨", "🎬", "💭", "🌟", "👀"];
    case "entertainment": return ["🎉", "🎬", "🍿", "🤩", "🎵"];
    default: return ["✨", "🎬", "🚀", "💡", "🔥"];
  }
}

function transliterateForHashtag(s: string): string {
  const cleaned = s.toLowerCase().replace(/[^\p{L}\p{N}\s-]+/gu, " ").trim();
  if (!cleaned) return "";
  return cleaned.split(/\s+/).slice(0, 3).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
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
    "#нейроклип", "#видео",
    ...baseTags.slice(0, 4).map((t) => `#${t}`),
    titleTag ? `#${titleTag}` : "",
  ].filter(Boolean);

  const shortTopic = topic.slice(0, 180).trim().replace(/\s+/g, " ");
  const longTopic = topic.slice(0, 380).trim().replace(/\s+/g, " ");

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
  const ytDurationLabel = `за ${durationLabel}`;

  const vkCaption =
    `${emojis[0]} ${title}\n\n` +
    `${longTopic}${longTopic.length < topic.length ? "…" : ""}\n\n` +
    `${emojis[1]} В видео — ${scenesCount} сцен, длительность ~${durationLabel}.\n` +
    `Смотрите до конца — самое интересное в финале!\n\n` +
    `${emojis[2]} Ставьте лайк, если было полезно, и сохраняйте, чтобы не потерять.`;
  const tgCaption =
    `${emojis[0]} **${title}**\n\n` +
    `${shortTopic}${shortTopic.length < topic.length ? "…" : ""}\n\n` +
    `Длительность: ${durationLabel} · ${scenesCount} сцен\n\n` +
    `Если зашло — поделитесь с другом ${emojis[3]}`;
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
  if (!p) { res.status(404).json({ error: "Проект не найден" }); return; }
  if (p.status !== "done") {
    res.status(400).json({ error: "Пост можно сгенерировать только для готового видео" });
    return;
  }
  const scenes = await loadScenes(p.id);
  const captions = buildCaptions({
    title: p.title,
    topic: p.topic_description,
    category: p.category,
    durationSec: p.duration_sec ?? p.target_duration_sec,
    scenesCount: scenes.length,
  });
  res.json({ captions });
});

export default router;
