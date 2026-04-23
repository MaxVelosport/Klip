import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  projectsTable,
  renderJobsTable,
  paymentsTable,
  plansTable,
} from "@workspace/db";
import { and, eq, desc, sql, gte, isNull } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthedRequest } from "../lib/session";

const router: IRouter = Router();

router.get("/admin/users", requireAuth, requireAdmin, async (_req: AuthedRequest, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(500);
  const counts = await db
    .select({ userId: projectsTable.userId, count: sql<number>`count(*)::int` })
    .from(projectsTable)
    .where(isNull(projectsTable.deletedAt))
    .groupBy(projectsTable.userId);
  const cmap = new Map(counts.map((c) => [c.userId, Number(c.count)]));
  res.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      planId: u.planId,
      tokenBalance: 0,
      projectCount: cmap.get(u.id) ?? 0,
      createdAt: u.createdAt.toISOString(),
    })),
  );
});

router.get("/admin/jobs", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await db
    .select({
      id: renderJobsTable.id,
      projectId: renderJobsTable.projectId,
      jobType: renderJobsTable.jobType,
      status: renderJobsTable.status,
      progress: renderJobsTable.progress,
      retryCount: renderJobsTable.retryCount,
      startedAt: renderJobsTable.startedAt,
      finishedAt: renderJobsTable.finishedAt,
      errorMessage: renderJobsTable.errorMessage,
      projectTitle: projectsTable.title,
      userEmail: usersTable.email,
    })
    .from(renderJobsTable)
    .leftJoin(projectsTable, eq(projectsTable.id, renderJobsTable.projectId))
    .leftJoin(usersTable, eq(usersTable.id, projectsTable.userId))
    .orderBy(desc(renderJobsTable.createdAt))
    .limit(200);
  res.json(
    rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      projectTitle: r.projectTitle ?? "—",
      userEmail: r.userEmail ?? "—",
      jobType: r.jobType,
      status: r.status,
      progress: r.progress,
      retryCount: r.retryCount,
      startedAt: r.startedAt?.toISOString() ?? null,
      finishedAt: r.finishedAt?.toISOString() ?? null,
      errorMessage: r.errorMessage,
    })),
  );
});

router.post("/admin/jobs/:jobId/retry", requireAuth, requireAdmin, async (req, res) => {
  const jobId = String(req.params.jobId);
  await db
    .update(renderJobsTable)
    .set({
      status: "running",
      progress: 5,
      retryCount: sql`${renderJobsTable.retryCount} + 1`,
      startedAt: new Date(),
      finishedAt: null,
      errorMessage: null,
    })
    .where(eq(renderJobsTable.id, jobId));
  const [j] = await db.select().from(renderJobsTable).where(eq(renderJobsTable.id, jobId)).limit(1);
  res.json({
    id: j!.id,
    projectId: j!.projectId,
    projectTitle: "—",
    userEmail: "—",
    jobType: j!.jobType,
    status: j!.status,
    progress: j!.progress,
    retryCount: j!.retryCount,
    startedAt: j!.startedAt?.toISOString() ?? null,
    finishedAt: j!.finishedAt?.toISOString() ?? null,
    errorMessage: j!.errorMessage,
  });
});

router.get("/admin/analytics", requireAuth, requireAdmin, async (_req, res) => {
  const [totalUsers] = await db.select({ c: sql<number>`count(*)::int` }).from(usersTable);
  const [totalProjects] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(projectsTable)
    .where(isNull(projectsTable.deletedAt));
  const [revenue] = await db
    .select({ s: sql<number>`coalesce(sum(${paymentsTable.amountRub}),0)` })
    .from(paymentsTable)
    .where(eq(paymentsTable.status, "succeeded"));
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [mau] = await db
    .select({ c: sql<number>`count(distinct ${projectsTable.userId})::int` })
    .from(projectsTable)
    .where(gte(projectsTable.updatedAt, monthAgo));
  const [dau] = await db
    .select({ c: sql<number>`count(distinct ${projectsTable.userId})::int` })
    .from(projectsTable)
    .where(gte(projectsTable.updatedAt, dayAgo));
  const usersByPlan = await db
    .select({ planId: usersTable.planId, c: sql<number>`count(*)::int` })
    .from(usersTable)
    .groupBy(usersTable.planId);
  const plans = await db.select().from(plansTable);
  const planNames = new Map(plans.map((p) => [p.id, p.name]));
  const free = usersByPlan.find((p) => p.planId === "free")?.c ?? 0;
  const paid = Number(totalUsers!.c) - Number(free);
  const conv = Number(totalUsers!.c) > 0 ? paid / Number(totalUsers!.c) : 0;
  const paidCount = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(paymentsTable)
    .where(and(eq(paymentsTable.status, "succeeded")));
  const totalRev = Number(revenue!.s ?? 0);
  const avgCheque = Number(paidCount[0]?.c ?? 0) > 0 ? totalRev / Number(paidCount[0]!.c) : 0;
  const monthlyRevenue = await db
    .select({
      month: sql<string>`to_char(${paymentsTable.createdAt}, 'YYYY-MM')`,
      revenue: sql<number>`coalesce(sum(${paymentsTable.amountRub}),0)`,
    })
    .from(paymentsTable)
    .where(eq(paymentsTable.status, "succeeded"))
    .groupBy(sql`to_char(${paymentsTable.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${paymentsTable.createdAt}, 'YYYY-MM')`);
  res.json({
    totalUsers: Number(totalUsers!.c),
    totalProjects: Number(totalProjects!.c),
    totalRevenueRub: totalRev,
    mau: Number(mau!.c),
    dau: Number(dau!.c),
    freeToPaidConversion: Number(conv.toFixed(4)),
    avgChequeRub: Number(avgCheque.toFixed(2)),
    revenueByMonth: monthlyRevenue.map((r) => ({ month: r.month, revenue: Number(r.revenue) })),
    usersByPlan: usersByPlan.map((u) => ({
      planId: u.planId,
      planName: planNames.get(u.planId) ?? u.planId,
      count: Number(u.c),
    })),
  });
});

export default router;
