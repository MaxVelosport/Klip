import { Router, type IRouter } from "express";
import { sbFrom, sbRpc, TABLE, type Plan, type Payment, type TokenTransaction } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../lib/session";
import { TOKEN_PACK_TOKENS, TOKEN_PACK_PRICE } from "../lib/presets";

const router: IRouter = Router();

async function addTokens(userId: string, delta: number, reason: string, refId?: string) {
  const { error } = await sbRpc("neyroclip_add_tokens", {
    p_user_id: userId,
    p_delta: delta,
    p_reason: reason,
    p_ref_id: refId ?? null,
  });
  if (error) throw new Error(error.message);
}

router.post("/billing/subscribe", requireAuth, async (req: AuthedRequest, res) => {
  const { planId, period } = req.body ?? {};
  if (!planId || (period !== "month" && period !== "year")) {
    res.status(400).json({ error: "Неверные параметры подписки" });
    return;
  }
  const { data: plan, error: planErr } = await sbFrom(TABLE.plans).select("*").eq("id", planId).maybeSingle();
  if (planErr) throw new Error(planErr.message);
  const p = plan as Plan | null;
  if (!p) {
    res.status(400).json({ error: "Тариф не найден" });
    return;
  }
  const amount = period === "year" ? p.price_year_rub : p.price_month_rub;
  const periodMs = (period === "year" ? 365 : 30) * 24 * 60 * 60 * 1000;
  const periodEnd = new Date(Date.now() + periodMs).toISOString();

  const { data: payment, error: payErr } = await sbFrom(TABLE.payments).insert({
    user_id: req.userId!,
    amount_rub: String(amount),
    status: "succeeded",
    purpose: "subscription",
    description: `Подписка ${p.name} (${period === "year" ? "год" : "месяц"})`,
    succeeded_at: new Date().toISOString(),
  }).select().single();
  if (payErr) throw new Error(payErr.message);
  const pay = payment as Payment;

  const { error: updErr } = await sbFrom(TABLE.users).update({
    plan_id: planId,
    current_period_end: periodEnd,
    videos_used_this_period: 0,
  }).eq("id", req.userId!);
  if (updErr) throw new Error(updErr.message);

  await sbFrom(TABLE.auditLog).insert({
    user_id: req.userId!,
    action: "subscribe",
    entity_type: "subscription",
    message: `Оформлена подписка ${p.name}`,
  });
  res.json({
    paymentId: pay.id,
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
  const { data: payment, error: payErr } = await sbFrom(TABLE.payments).insert({
    user_id: req.userId!,
    amount_rub: String(price),
    status: "succeeded",
    purpose: "tokens",
    description: `Покупка ${tokens} жетонов`,
    succeeded_at: new Date().toISOString(),
  }).select().single();
  if (payErr) throw new Error(payErr.message);
  const pay = payment as Payment;

  await addTokens(req.userId!, tokens, "purchase", pay.id);
  await sbFrom(TABLE.auditLog).insert({
    user_id: req.userId!,
    action: "tokens_purchased",
    entity_type: "tokens",
    message: `Куплено ${tokens} жетонов`,
  });
  res.json({
    paymentId: pay.id,
    confirmationUrl: "",
    amountRub: price,
    status: "succeeded",
  });
});

router.post("/billing/subscription/cancel", requireAuth, async (req: AuthedRequest, res) => {
  await sbFrom(TABLE.auditLog).insert({
    user_id: req.userId!,
    action: "subscription_cancel",
    entity_type: "subscription",
    message: "Подписка отменена с конца периода",
  });
  res.json({ ok: true });
});

router.get("/billing/token-transactions", requireAuth, async (req: AuthedRequest, res) => {
  const { data: rows, error } = await sbFrom(TABLE.tokenTransactions)
    .select("*")
    .eq("user_id", req.userId!)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
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
    ((rows ?? []) as TokenTransaction[]).map((t) => ({
      id: t.id,
      delta: t.delta,
      reason: t.reason,
      reasonLabel: REASON_LABELS[t.reason] ?? t.reason,
      refId: t.ref_id,
      createdAt: t.created_at,
    })),
  );
});

router.get("/billing/payments", requireAuth, async (req: AuthedRequest, res) => {
  const { data: rows, error } = await sbFrom(TABLE.payments)
    .select("*")
    .eq("user_id", req.userId!)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  res.json(
    ((rows ?? []) as Payment[]).map((p) => ({
      id: p.id,
      amountRub: Number(p.amount_rub),
      status: p.status,
      purpose: p.purpose,
      description: p.description,
      createdAt: p.created_at,
    })),
  );
});

const PROMO_ERRORS: Record<string, string> = {
  PROMO_NOT_FOUND: "Промокод не найден или неактивен",
  PROMO_NOT_STARTED: "Промокод ещё не действует",
  PROMO_EXPIRED: "Срок действия промокода истёк",
  PROMO_LIMIT_REACHED: "Промокод исчерпан",
  PROMO_ALREADY_USED: "Вы уже использовали этот промокод",
};

router.post("/billing/promo", requireAuth, async (req: AuthedRequest, res) => {
  const { code } = req.body ?? {};
  if (!code) {
    res.status(400).json({ error: "Введите промокод" });
    return;
  }
  const normalized = String(code).trim().toUpperCase();

  const { data, error } = await sbRpc<{
    code: string;
    discount_type: string;
    discount_value: number;
    used_count: number;
  }>("neyroclip_use_promo_code", {
    p_code: normalized,
    p_user_id: req.userId!,
  });

  if (error) {
    for (const [key, msg] of Object.entries(PROMO_ERRORS)) {
      if (error.message?.includes(key)) {
        res.status(400).json({ error: msg });
        return;
      }
    }
    throw new Error(error.message);
  }

  const result = data!;
  const tokensAdded = result.discount_type === "tokens" ? result.discount_value : 0;

  await sbFrom(TABLE.auditLog).insert({
    user_id: req.userId!,
    action: "promo_used",
    entity_type: "promo",
    entity_id: normalized,
    message: tokensAdded > 0 ? `Промокод ${normalized}: +${tokensAdded} жетонов` : `Промокод ${normalized} применён`,
  });

  res.json({
    ok: true,
    message: tokensAdded > 0 ? `Начислено ${tokensAdded} жетонов` : "Промокод применён",
    tokensAdded,
  });
});

export default router;
