import { Router, type IRouter } from "express";
import {
  db,
  projectsTable,
  auditLogTable,
  usersTable,
  plansTable,
  tokenBalancesTable,
} from "@workspace/db";
import { and, eq, isNull, desc, sql, gte } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../lib/session";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(projectsTable)
    .where(and(eq(projectsTable.userId, userId), isNull(projectsTable.deletedAt)));
  const breakdownRows = await db
    .select({ status: projectsTable.status, count: sql<number>`count(*)::int` })
    .from(projectsTable)
    .where(and(eq(projectsTable.userId, userId), isNull(projectsTable.deletedAt)))
    .groupBy(projectsTable.status);
  const breakdown = new Map(breakdownRows.map((r) => [r.status, Number(r.count)]));
  const [durationRow] = await db
    .select({ total: sql<number>`coalesce(sum(${projectsTable.durationSec}),0)::int` })
    .from(projectsTable)
    .where(and(eq(projectsTable.userId, userId), isNull(projectsTable.deletedAt)));
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [monthRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.userId, userId),
        isNull(projectsTable.deletedAt),
        eq(projectsTable.status, "done"),
        gte(projectsTable.updatedAt, monthAgo),
      ),
    );
  const recent = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.userId, userId), isNull(projectsTable.deletedAt)))
    .orderBy(desc(projectsTable.updatedAt))
    .limit(4);
  const activity = await db
    .select()
    .from(auditLogTable)
    .where(eq(auditLogTable.userId, userId))
    .orderBy(desc(auditLogTable.createdAt))
    .limit(10);
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, u!.planId)).limit(1);
  const [bal] = await db
    .select()
    .from(tokenBalancesTable)
    .where(eq(tokenBalancesTable.userId, userId))
    .limit(1);

  const inProgress =
    (breakdown.get("draft") ?? 0) +
    (breakdown.get("script_ready") ?? 0) +
    (breakdown.get("images_ready") ?? 0) +
    (breakdown.get("audio_ready") ?? 0);
  res.json({
    totalProjects: Number(total),
    completedProjects: breakdown.get("done") ?? 0,
    renderingProjects: breakdown.get("rendering") ?? 0,
    draftProjects: inProgress,
    totalDurationSec: Number(durationRow?.total ?? 0),
    videosThisMonth: Number(monthRow?.count ?? 0),
    tokenBalance: bal?.balance ?? 0,
    videosRemaining: Math.max(0, (plan?.videosPerMonth ?? 0) - (u?.videosUsedThisPeriod ?? 0)),
    statusBreakdown: Array.from(breakdown.entries()).map(([status, count]) => ({ status, count })),
    recentProjects: recent.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      currentStep: p.currentStep,
      durationSec: p.durationSec,
      thumbnailUrl: p.thumbnailUrl,
      finalVideoUrl: p.finalVideoUrl,
      sceneCount: 0,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    recentActivity: activity.map((a) => ({
      id: String(a.id),
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      message: a.message,
      createdAt: a.createdAt.toISOString(),
    })),
  });
});

export default router;
