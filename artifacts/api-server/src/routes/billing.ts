import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  plansTable,
  paymentsTable,
  tokenBalancesTable,
  tokenTransactionsTable,
  promoCodesTable,
  auditLogTable,
} from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../lib/session";
import { TOKEN_PACK_TOKENS, TOKEN_PACK_PRICE } from "../lib/presets";

const router: IRouter = Router();

async function ensureBalance(userId: string) {
  await db.insert(tokenBalancesTable).values({ userId, balance: 0 }).onConflictDoNothing();
}

async function addTokens(userId: string, delta: number, reason: string, refId?: string) {
  await ensureBalance(userId);
  await db
    .update(tokenBalancesTable)
    .set({ balance: sql`${tokenBalancesTable.balance} + ${delta}` })
    .where(eq(tokenBalancesTable.userId, userId));
  await db.insert(tokenTransactionsTable).values({ userId, delta, reason, refId: refId ?? null });
}

router.post("/billing/subscribe", requireAuth, async (req: AuthedRequest, res) => {
  const { planId, period } = req.body ?? {};
  if (!planId || (period !== "month" && period !== "year")) {
    res.status(400).json({ error: "Неверные параметры подписки" });
    return;
  }
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, planId)).limit(1);
  if (!plan) {
    res.status(400).json({ error: "Тариф не найден" });
    return;
  }
  const amount = period === "year" ? plan.priceYearRub : plan.priceMonthRub;
  const periodMs = (period === "year" ? 365 : 30) * 24 * 60 * 60 * 1000;
  const periodEnd = new Date(Date.now() + periodMs);
  const [payment] = await db
    .insert(paymentsTable)
    .values({
      userId: req.userId!,
      amountRub: String(amount),
      status: "succeeded",
      purpose: "subscription",
      description: `Подписка ${plan.name} (${period === "year" ? "год" : "месяц"})`,
      succeededAt: new Date(),
    })
    .returning();
  await db
    .update(usersTable)
    .set({ planId, currentPeriodEnd: periodEnd, videosUsedThisPeriod: 0 })
    .where(eq(usersTable.id, req.userId!));
  await db.insert(auditLogTable).values({
    userId: req.userId!,
    action: "subscribe",
    entityType: "subscription",
    message: `Оформлена подписка ${plan.name}`,
  });
  res.json({
    paymentId: payment!.id,
    confirmationUrl: "",
    amountRub: amount,
    status: "succeeded",
  });
});

router.post("/billing/tokens/purchase", requireAuth, async (req: AuthedRequest, res) => {
  const { pack } = req.body ?? {};
  const tokens = TOKEN_PACK_TOKENS[pack];
  const price = TOKEN_PACK_PRICE[pack];
  if (!tokens || !price) {
    res.status(400).json({ error: "Неверный пакет" });
    return;
  }
  const [payment] = await db
    .insert(paymentsTable)
    .values({
      userId: req.userId!,
      amountRub: String(price),
      status: "succeeded",
      purpose: "tokens",
      description: `Покупка ${tokens} жетонов`,
      succeededAt: new Date(),
    })
    .returning();
  await addTokens(req.userId!, tokens, "purchase", payment!.id);
  await db.insert(auditLogTable).values({
    userId: req.userId!,
    action: "tokens_purchased",
    entityType: "tokens",
    message: `Куплено ${tokens} жетонов`,
  });
  res.json({
    paymentId: payment!.id,
    confirmationUrl: "",
    amountRub: price,
    status: "succeeded",
  });
});

router.post("/billing/subscription/cancel", requireAuth, async (req: AuthedRequest, res) => {
  await db.insert(auditLogTable).values({
    userId: req.userId!,
    action: "subscription_cancel",
    entityType: "subscription",
    message: "Подписка отменена с конца периода",
  });
  res.json({ ok: true });
});

router.get("/billing/token-transactions", requireAuth, async (req: AuthedRequest, res) => {
  const rows = await db
    .select()
    .from(tokenTransactionsTable)
    .where(eq(tokenTransactionsTable.userId, req.userId!))
    .orderBy(desc(tokenTransactionsTable.createdAt))
    .limit(100);
  const REASON_LABELS: Record<string, string> = {
    render: "Рендер видео",
    rerender: "Повторная сборка",
    purchase: "Покупка жетонов",
    grant: "Начисление",
    promo: "Промокод",
    refund: "Возврат",
    plan_bonus: "Бонус по тарифу",
  };
  res.json(
    rows.map((t) => ({
      id: t.id,
      delta: t.delta,
      reason: t.reason,
      reasonLabel: REASON_LABELS[t.reason] ?? t.reason,
      refId: t.refId,
      createdAt: t.createdAt.toISOString(),
    })),
  );
});

router.get("/billing/payments", requireAuth, async (req: AuthedRequest, res) => {
  const rows = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.userId, req.userId!))
    .orderBy(desc(paymentsTable.createdAt))
    .limit(100);
  res.json(
    rows.map((p) => ({
      id: p.id,
      amountRub: Number(p.amountRub),
      status: p.status,
      purpose: p.purpose,
      description: p.description,
      createdAt: p.createdAt.toISOString(),
    })),
  );
});

router.post("/billing/promo", requireAuth, async (req: AuthedRequest, res) => {
  const { code } = req.body ?? {};
  if (!code) {
    res.status(400).json({ error: "Введите промокод" });
    return;
  }
  const normalized = String(code).trim().toUpperCase();
  const [promo] = await db.select().from(promoCodesTable).where(eq(promoCodesTable.code, normalized)).limit(1);
  if (!promo || !promo.isActive) {
    res.status(400).json({ error: "Промокод не найден или неактивен" });
    return;
  }
  if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
    res.status(400).json({ error: "Промокод исчерпан" });
    return;
  }
  const tokensAdded = promo.discountType === "tokens" ? promo.discountValue : 0;
  if (tokensAdded > 0) {
    await addTokens(req.userId!, tokensAdded, "promo", normalized);
  }
  await db
    .update(promoCodesTable)
    .set({ usedCount: sql`${promoCodesTable.usedCount} + 1` })
    .where(eq(promoCodesTable.code, normalized));
  res.json({
    ok: true,
    message: tokensAdded > 0 ? `Начислено ${tokensAdded} жетонов` : "Промокод применён",
    tokensAdded,
  });
});

export default router;
