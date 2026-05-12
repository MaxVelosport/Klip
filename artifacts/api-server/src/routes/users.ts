import { Router, type IRouter } from "express";
import { sbFrom, TABLE } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../lib/session";
import { buildCurrentUser } from "./users-helpers";

const router: IRouter = Router();

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const ALLOWED_FONTS = new Set(["inter", "manrope", "rubik", "playfair", "montserrat"]);

function defaultBrandKit(userId: string) {
  return {
    user_id: userId,
    brand_name: "",
    logo_url: null as string | null,
    primary_color: "#7c3aed",
    accent_color: "#06b6d4",
    font_choice: "inter",
    watermark_text: "",
    tagline: "",
  };
}

function serializeBrandKit(kit: ReturnType<typeof defaultBrandKit>) {
  return {
    brandName: kit.brand_name ?? "",
    logoUrl: kit.logo_url ?? null,
    primaryColor: kit.primary_color,
    accentColor: kit.accent_color,
    fontChoice: kit.font_choice,
    watermarkText: kit.watermark_text ?? "",
    tagline: kit.tagline ?? "",
  };
}

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await buildCurrentUser(req.userId!);
  if (!user) {
    res.status(401).json({ error: "Сессия недействительна" });
    return;
  }
  res.json(user);
});

router.patch("/me", requireAuth, async (req: AuthedRequest, res) => {
  const { name, avatarUrl, phone } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
  if (phone !== undefined) updates.phone = phone;
  if (Object.keys(updates).length > 0) {
    const { error } = await sbFrom(TABLE.users).update(updates).eq("id", req.userId!);
    if (error) throw new Error(error.message);
  }
  const user = await buildCurrentUser(req.userId!);
  res.json(user);
});

router.get("/me/usage", requireAuth, async (req: AuthedRequest, res) => {
  const { data: u, error: uErr } = await sbFrom(TABLE.users).select("*").eq("id", req.userId!).maybeSingle();
  if (uErr) throw new Error(uErr.message);
  if (!u) {
    res.status(401).json({ error: "Сессия недействительна" });
    return;
  }
  const [planRes, balRes] = await Promise.all([
    sbFrom(TABLE.plans).select("*").eq("id", u.plan_id).maybeSingle(),
    sbFrom(TABLE.tokenBalances).select("*").eq("user_id", u.id).maybeSingle(),
  ]);
  const plan = planRes.data;
  const bal = balRes.data;
  res.json({
    planId: u.plan_id,
    planName: plan?.name ?? u.plan_id,
    videosUsedThisPeriod: u.videos_used_this_period,
    videosQuota: plan?.videos_per_month ?? 0,
    videosRemaining: Math.max(0, (plan?.videos_per_month ?? 0) - u.videos_used_this_period),
    tokenBalance: bal?.balance ?? 0,
    maxDurationMin: plan?.max_duration_min ?? 1,
    currentPeriodEnd: u.current_period_end ?? null,
  });
});

router.get("/me/brand-kit", requireAuth, async (req: AuthedRequest, res) => {
  const { data: row, error } = await sbFrom(TABLE.brandKits).select("*").eq("user_id", req.userId!).maybeSingle();
  if (error) throw new Error(error.message);
  res.json(serializeBrandKit(row ?? defaultBrandKit(req.userId!)));
});

router.put("/me/brand-kit", requireAuth, async (req: AuthedRequest, res) => {
  const b = req.body ?? {};
  if (b.primaryColor !== undefined && (typeof b.primaryColor !== "string" || !HEX_COLOR_RE.test(b.primaryColor))) {
    res.status(400).json({ error: "Основной цвет должен быть в формате #RRGGBB" });
    return;
  }
  if (b.accentColor !== undefined && (typeof b.accentColor !== "string" || !HEX_COLOR_RE.test(b.accentColor))) {
    res.status(400).json({ error: "Акцентный цвет должен быть в формате #RRGGBB" });
    return;
  }
  if (b.fontChoice !== undefined && (typeof b.fontChoice !== "string" || !ALLOWED_FONTS.has(b.fontChoice))) {
    res.status(400).json({ error: "Недопустимый шрифт" });
    return;
  }
  const trimStr = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  const logoUrl =
    b.logoUrl === null
      ? null
      : typeof b.logoUrl === "string" && b.logoUrl.trim()
        ? b.logoUrl.trim().slice(0, 500)
        : undefined;

  const { data: existing, error: existErr } = await sbFrom(TABLE.brandKits)
    .select("user_id")
    .eq("user_id", req.userId!)
    .maybeSingle();
  if (existErr) throw new Error(existErr.message);

  let row: any;
  if (existing) {
    const update: Record<string, unknown> = {};
    if (b.brandName !== undefined) update.brand_name = trimStr(b.brandName, 60);
    if (logoUrl !== undefined) update.logo_url = logoUrl;
    if (b.primaryColor !== undefined) update.primary_color = b.primaryColor;
    if (b.accentColor !== undefined) update.accent_color = b.accentColor;
    if (b.fontChoice !== undefined) update.font_choice = b.fontChoice;
    if (b.watermarkText !== undefined) update.watermark_text = trimStr(b.watermarkText, 80);
    if (b.tagline !== undefined) update.tagline = trimStr(b.tagline, 120);

    if (Object.keys(update).length > 0) {
      const { data, error } = await sbFrom(TABLE.brandKits).update(update).eq("user_id", req.userId!).select().single();
      if (error) throw new Error(error.message);
      row = data;
    } else {
      const { data, error } = await sbFrom(TABLE.brandKits).select("*").eq("user_id", req.userId!).single();
      if (error) throw new Error(error.message);
      row = data;
    }
  } else {
    const { data, error } = await sbFrom(TABLE.brandKits).insert({
      user_id: req.userId!,
      brand_name: b.brandName !== undefined ? trimStr(b.brandName, 60) : "",
      logo_url: logoUrl !== undefined ? logoUrl : null,
      primary_color: b.primaryColor ?? "#7c3aed",
      accent_color: b.accentColor ?? "#06b6d4",
      font_choice: b.fontChoice ?? "inter",
      watermark_text: b.watermarkText !== undefined ? trimStr(b.watermarkText, 80) : "",
      tagline: b.tagline !== undefined ? trimStr(b.tagline, 120) : "",
    }).select().single();
    if (error) throw new Error(error.message);
    row = data;
  }

  res.json(serializeBrandKit(row));
});

export default router;
