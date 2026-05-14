import { sbFrom, TABLE, type User, type Plan, type TokenBalance } from "@workspace/db";

export async function buildCurrentUser(userId: string) {
  const { data: raw, error: uErr } = await sbFrom(TABLE.users).select("*").eq("id", userId).maybeSingle();
  if (uErr) throw new Error(uErr.message);
  const u = raw as User | null;
  if (!u) return null;

  const [planRes, balRes] = await Promise.all([
    sbFrom(TABLE.plans).select("*").eq("id", u.plan_id).maybeSingle(),
    sbFrom(TABLE.tokenBalances).select("*").eq("user_id", u.id).maybeSingle(),
  ]);
  const plan = planRes.data as Plan | null;
  const bal = balRes.data as TokenBalance | null;

  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatar_url ?? null,
    phone: u.phone ?? null,
    role: u.role,
    planId: u.plan_id,
    planName: plan?.name ?? u.plan_id,
    tokenBalance: bal?.balance ?? 0,
    videosUsedThisPeriod: u.videos_used_this_period,
    videosQuota: plan?.videos_per_month ?? 0,
    currentPeriodEnd: u.current_period_end ?? null,
    cancelAtPeriodEnd: false,
    createdAt: u.created_at,
  };
}
