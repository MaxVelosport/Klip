import { db, usersTable, plansTable, tokenBalancesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function buildCurrentUser(userId: string) {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!u) return null;
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, u.planId)).limit(1);
  const [bal] = await db
    .select()
    .from(tokenBalancesTable)
    .where(eq(tokenBalancesTable.userId, u.id))
    .limit(1);
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl ?? null,
    phone: u.phone ?? null,
    role: u.role,
    planId: u.planId,
    planName: plan?.name ?? u.planId,
    tokenBalance: bal?.balance ?? 0,
    videosUsedThisPeriod: u.videosUsedThisPeriod,
    videosQuota: plan?.videosPerMonth ?? 0,
    currentPeriodEnd: u.currentPeriodEnd ? u.currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: false,
    createdAt: u.createdAt.toISOString(),
  };
}
