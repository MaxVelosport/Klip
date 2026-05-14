import { Router, type IRouter } from "express";
import {
  sbFrom, TABLE,
  type User, type Project, type AuditLog, type Plan, type TokenBalance,
} from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../lib/session";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [statsRes, recentRes, activityRes, userRes] = await Promise.all([
    sbFrom(TABLE.projects)
      .select("status, duration_sec, updated_at")
      .eq("user_id", userId)
      .is("deleted_at", null),
    sbFrom(TABLE.projects)
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(4),
    sbFrom(TABLE.auditLog)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    sbFrom(TABLE.users).select("*").eq("id", userId).maybeSingle(),
  ]);

  if (statsRes.error) throw new Error(statsRes.error.message);
  if (recentRes.error) throw new Error(recentRes.error.message);
  if (activityRes.error) throw new Error(activityRes.error.message);
  if (userRes.error) throw new Error(userRes.error.message);

  const u = userRes.data as User | null;
  if (!u) { res.status(401).json({ error: "Сессия недействительна" }); return; }

  const [planRes, balRes] = await Promise.all([
    sbFrom(TABLE.plans).select("*").eq("id", u.plan_id).maybeSingle(),
    sbFrom(TABLE.tokenBalances).select("*").eq("user_id", userId).maybeSingle(),
  ]);
  const plan = planRes.data as Plan | null;
  const bal = balRes.data as TokenBalance | null;

  type StatRow = Pick<Project, "status" | "duration_sec" | "updated_at">;
  const statsRows = (statsRes.data ?? []) as StatRow[];
  const breakdown = new Map<string, number>();
  let totalDurationSec = 0;
  let videosThisMonth = 0;
  for (const p of statsRows) {
    breakdown.set(p.status, (breakdown.get(p.status) ?? 0) + 1);
    totalDurationSec += p.duration_sec ?? 0;
    if (p.status === "done" && p.updated_at >= monthAgo) videosThisMonth++;
  }

  const inProgress =
    (breakdown.get("draft") ?? 0) +
    (breakdown.get("script_ready") ?? 0) +
    (breakdown.get("images_ready") ?? 0) +
    (breakdown.get("audio_ready") ?? 0);

  const recent = (recentRes.data ?? []) as Project[];
  const activity = (activityRes.data ?? []) as AuditLog[];

  res.json({
    totalProjects: statsRows.length,
    completedProjects: breakdown.get("done") ?? 0,
    renderingProjects: breakdown.get("rendering") ?? 0,
    draftProjects: inProgress,
    totalDurationSec,
    videosThisMonth,
    tokenBalance: bal?.balance ?? 0,
    videosRemaining: Math.max(0, (plan?.videos_per_month ?? 0) - (u.videos_used_this_period ?? 0)),
    statusBreakdown: Array.from(breakdown.entries()).map(([status, count]) => ({ status, count })),
    recentProjects: recent.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      currentStep: p.current_step,
      durationSec: p.duration_sec,
      thumbnailUrl: p.thumbnail_url,
      finalVideoUrl: p.final_video_url,
      sceneCount: 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
    recentActivity: activity.map((a) => ({
      id: String(a.id),
      action: a.action,
      entityType: a.entity_type,
      entityId: a.entity_id ?? null,
      message: a.message,
      createdAt: a.created_at,
    })),
  });
});

export default router;
