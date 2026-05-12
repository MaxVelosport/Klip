import { Router, type IRouter } from "express";
import { sbFrom, sbRpc, TABLE } from "@workspace/db";
import { requireAuth, requireAdmin, type AuthedRequest } from "../lib/session";

const router: IRouter = Router();

router.get("/admin/users", requireAuth, requireAdmin, async (_req: AuthedRequest, res) => {
  const { data: users, error: usersErr } = await sbFrom(TABLE.users)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (usersErr) throw new Error(usersErr.message);

  const { data: projRows } = await sbFrom(TABLE.projects).select("user_id").is("deleted_at", null);
  const cmap = new Map<string, number>();
  for (const row of projRows ?? []) {
    cmap.set((row as any).user_id, (cmap.get((row as any).user_id) ?? 0) + 1);
  }

  res.json(
    (users ?? []).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      planId: u.plan_id,
      tokenBalance: 0,
      projectCount: cmap.get(u.id) ?? 0,
      createdAt: u.created_at,
    })),
  );
});

router.get("/admin/jobs", requireAuth, requireAdmin, async (_req, res) => {
  const { data: jobs, error: jobsErr } = await sbFrom(TABLE.renderJobs)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (jobsErr) throw new Error(jobsErr.message);
  if (!jobs?.length) { res.json([]); return; }

  const projectIds = [...new Set((jobs as any[]).map((j) => j.project_id).filter(Boolean))];
  const { data: projects } = await sbFrom(TABLE.projects)
    .select("id, title, user_id")
    .in("id", projectIds);
  const projectMap = new Map((projects ?? []).map((p: any) => [p.id, p]));

  const userIds = [...new Set((projects ?? []).map((p: any) => p.user_id).filter(Boolean))];
  const { data: users } = userIds.length
    ? await sbFrom(TABLE.users).select("id, email").in("id", userIds)
    : { data: [] };
  const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));

  res.json(
    (jobs as any[]).map((r) => {
      const project = projectMap.get(r.project_id);
      const user = project ? userMap.get(project.user_id) : null;
      return {
        id: r.id,
        projectId: r.project_id,
        projectTitle: project?.title ?? "—",
        userEmail: user?.email ?? "—",
        jobType: r.job_type,
        status: r.status,
        progress: r.progress,
        retryCount: r.retry_count,
        startedAt: r.started_at ?? null,
        finishedAt: r.finished_at ?? null,
        errorMessage: r.error_message,
      };
    }),
  );
});

router.post("/admin/jobs/:jobId/retry", requireAuth, requireAdmin, async (req, res) => {
  const jobId = String(req.params.jobId);
  const { data: current, error: fetchErr } = await sbFrom(TABLE.renderJobs)
    .select("retry_count")
    .eq("id", jobId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);

  const { error: updErr } = await sbFrom(TABLE.renderJobs).update({
    status: "running",
    progress: 5,
    retry_count: ((current as any)?.retry_count ?? 0) + 1,
    started_at: new Date().toISOString(),
    finished_at: null,
    error_message: null,
  }).eq("id", jobId);
  if (updErr) throw new Error(updErr.message);

  const { data: j } = await sbFrom(TABLE.renderJobs).select("*").eq("id", jobId).single();
  const job = j as any;
  res.json({
    id: job.id,
    projectId: job.project_id,
    projectTitle: "—",
    userEmail: "—",
    jobType: job.job_type,
    status: job.status,
    progress: job.progress,
    retryCount: job.retry_count,
    startedAt: job.started_at ?? null,
    finishedAt: job.finished_at ?? null,
    errorMessage: job.error_message,
  });
});

router.get("/admin/analytics", requireAuth, requireAdmin, async (_req, res) => {
  const { data, error } = await sbRpc("neyroclip_admin_analytics");
  if (error) throw new Error(error.message);
  const d = data as any;
  res.json({
    totalUsers: d.total_users,
    totalProjects: d.total_projects,
    totalRevenueRub: Number(d.total_revenue_rub ?? 0),
    mau: d.mau,
    dau: d.dau,
    freeToPaidConversion: Number(d.free_to_paid_conversion ?? 0),
    avgChequeRub: Number(d.avg_cheque_rub ?? 0),
    revenueByMonth: (d.revenue_by_month ?? []).map((r: any) => ({
      month: r.month,
      revenue: Number(r.revenue),
    })),
    usersByPlan: (d.users_by_plan ?? []).map((u: any) => ({
      planId: u.plan_id,
      planName: u.plan_name ?? u.plan_id,
      count: u.count,
    })),
  });
});

export default router;
