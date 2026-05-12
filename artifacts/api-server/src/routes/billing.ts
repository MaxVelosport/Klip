import { Router, type IRouter } from "express";
import { sbFrom, sbRpc, TABLE } from "@workspace/db";
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
  if (!plan) {
    res.status(400).json({ error: "Тариф не найден" });
    return;
  }
  const amount = period === "year" ? (plan as any).price_year_rub : (plan as any).price_month_rub;
  const periodMs = (period === "year" ? 365 : 30) * 24 * 60 * 60 * 1000;
  const periodEnd = new Date(Date.now() + periodMs).toISOString();

  const { data: payment, error: payErr } = await sbFrom(TABLE.payments).insert({
    user_id: req.userId!,
    amount_rub: String(amount),
    status: "succeeded",
    purpose: "subscription",
    description: `Подписка ${(plan as any).name} (${period === "year" ? "год" : "месяц"})`,
    succeeded_at: new Date().toISOString(),
  }).select().single();
  if (payErr) throw new Error(payErr.message);

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
    message: `Оформлена подписка ${(plan as any).name}`,
  });
  res.json({
    paymentId: (payment as any).id,
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

  await addTokens(req.userId!, tokens, "purchase", (payment as any).id);
  await sbFrom(TABLE.auditLog).insert({
    user_id: req.userId!,
    action: "tokens_purchased",
    entity_type: "tokens",
    message: `Куплено ${tokens} жетонов`,
  });
  res.json({
    paymentId: (payment as any).id,
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
    (rows ?? []).map((t: any) => ({
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
    (rows ?? []).map((p: any) => ({
      id: p.id,
      amountRub: Number(p.amount_rub),
      status: p.status,
      purpose: p.purpose,
      description: p.description,
      createdAt: p.created_at,
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
  const { data: promo, error: promoErr } = await sbFrom(TABLE.promoCodes)
    .select("*")
    .eq("code", normalized)
    .maybeSingle();
  if (promoErr) throw new Error(promoErr.message);
  if (!promo || !(promo as any).is_active) {
    res.status(400).json({ error: "Промокод не найден или неактивен" });
    return;
  }
  if ((promo as any).max_uses > 0 && (promo as any).used_count >= (promo as any).max_uses) {
    res.status(400).json({ error: "Промокод исчерпан" });
    return;
  }
  const tokensAdded = (promo as any).discount_type === "tokens" ? (promo as any).discount_value : 0;
  if (tokensAdded > 0) {
    await addTokens(req.userId!, tokensAdded, "promo", normalized);
  }
  // non-atomic increment — acceptable race condition (post-pitch: neyroclip_increment_promo RPC)
  await sbFrom(TABLE.promoCodes)
    .update({ used_count: (promo as any).used_count + 1 })
    .eq("code", normalized);
  res.json({
    ok: true,
    message: tokensAdded > 0 ? `Начислено ${tokensAdded} жетонов` : "Промокод применён",
    tokensAdded,
  });
});

export default router;
