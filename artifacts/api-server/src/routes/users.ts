import { Router, type IRouter } from "express";
import { db, usersTable, plansTable, tokenBalancesTable, brandKitsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../lib/session";
import { buildCurrentUser } from "./users-helpers";

const router: IRouter = Router();

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const ALLOWED_FONTS = new Set(["inter", "manrope", "rubik", "playfair", "montserrat"]);

function defaultBrandKit(userId: string) {
  return {
    userId,
    brandName: "",
    logoUrl: null,
    primaryColor: "#7c3aed",
    accentColor: "#06b6d4",
    fontChoice: "inter",
    watermarkText: "",
    tagline: "",
  };
}

function serializeBrandKit(kit: typeof brandKitsTable.$inferSelect | ReturnType<typeof defaultBrandKit>) {
  return {
    brandName: kit.brandName ?? "",
    logoUrl: kit.logoUrl ?? null,
    primaryColor: kit.primaryColor,
    accentColor: kit.accentColor,
    fontChoice: kit.fontChoice,
    watermarkText: kit.watermarkText ?? "",
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
  await db
    .update(usersTable)
    .set({
      name: typeof name === "string" && name.trim() ? name.trim() : undefined,
      avatarUrl: avatarUrl === undefined ? undefined : avatarUrl,
      phone: phone === undefined ? undefined : phone,
    })
    .where(eq(usersTable.id, req.userId!));
  const user = await buildCurrentUser(req.userId!);
  res.json(user);
});

router.get("/me/usage", requireAuth, async (req: AuthedRequest, res) => {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!u) {
    res.status(401).json({ error: "Сессия недействительна" });
    return;
  }
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, u.planId)).limit(1);
  const [bal] = await db
    .select()
    .from(tokenBalancesTable)
    .where(eq(tokenBalancesTable.userId, u.id))
    .limit(1);
  res.json({
    planId: u.planId,
    planName: plan?.name ?? u.planId,
    videosUsedThisPeriod: u.videosUsedThisPeriod,
    videosQuota: plan?.videosPerMonth ?? 0,
    videosRemaining: Math.max(0, (plan?.videosPerMonth ?? 0) - u.videosUsedThisPeriod),
    tokenBalance: bal?.balance ?? 0,
    maxDurationMin: plan?.maxDurationMin ?? 1,
    currentPeriodEnd: u.currentPeriodEnd ? u.currentPeriodEnd.toISOString() : null,
  });
});

router.get("/me/brand-kit", requireAuth, async (req: AuthedRequest, res) => {
  const [row] = await db
    .select()
    .from(brandKitsTable)
    .where(eq(brandKitsTable.userId, req.userId!))
    .limit(1);
  res.json(serializeBrandKit(row ?? defaultBrandKit(req.userId!)));
});

router.put("/me/brand-kit", requireAuth, async (req: AuthedRequest, res) => {
  const b = req.body ?? {};
  // Валидация цветов: только #rrggbb. Иначе — 400.
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
  // Жёсткие ограничения длин — защита от мусора в UI и в caption-генераторе
  const trimStr = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  const logoUrl =
    b.logoUrl === null
      ? null
      : typeof b.logoUrl === "string" && b.logoUrl.trim()
        ? b.logoUrl.trim().slice(0, 500)
        : undefined;

  const values = {
    userId: req.userId!,
    brandName: b.brandName !== undefined ? trimStr(b.brandName, 60) : undefined,
    logoUrl,
    primaryColor: b.primaryColor,
    accentColor: b.accentColor,
    fontChoice: b.fontChoice,
    watermarkText: b.watermarkText !== undefined ? trimStr(b.watermarkText, 80) : undefined,
    tagline: b.tagline !== undefined ? trimStr(b.tagline, 120) : undefined,
  };

  // Удаляем undefined, чтобы не перетереть существующие значения нулями
  const cleaned: Record<string, unknown> = { userId: req.userId! };
  for (const [k, v] of Object.entries(values)) {
    if (v !== undefined) cleaned[k] = v;
  }

  const [existing] = await db
    .select()
    .from(brandKitsTable)
    .where(eq(brandKitsTable.userId, req.userId!))
    .limit(1);

  let row;
  if (existing) {
    const updateOnly: Record<string, unknown> = { ...cleaned };
    delete updateOnly.userId;
    if (Object.keys(updateOnly).length > 0) {
      [row] = await db
        .update(brandKitsTable)
        .set(updateOnly)
        .where(eq(brandKitsTable.userId, req.userId!))
        .returning();
    } else {
      row = existing;
    }
  } else {
    [row] = await db
      .insert(brandKitsTable)
      .values({
        userId: req.userId!,
        brandName: (cleaned.brandName as string | undefined) ?? "",
        logoUrl: cleaned.logoUrl as string | null | undefined,
        primaryColor: (cleaned.primaryColor as string | undefined) ?? "#7c3aed",
        accentColor: (cleaned.accentColor as string | undefined) ?? "#06b6d4",
        fontChoice: (cleaned.fontChoice as string | undefined) ?? "inter",
        watermarkText: (cleaned.watermarkText as string | undefined) ?? "",
        tagline: (cleaned.tagline as string | undefined) ?? "",
      })
      .returning();
  }

  res.json(serializeBrandKit(row!));
});

export default router;
