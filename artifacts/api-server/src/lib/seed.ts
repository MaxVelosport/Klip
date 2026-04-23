import { db, plansTable, promoCodesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function seedStaticData() {
  await db
    .insert(plansTable)
    .values([
      {
        id: "free",
        name: "Free",
        tagline: "Попробовать без вложений",
        priceMonthRub: 0,
        priceYearRub: 0,
        videosPerMonth: 3,
        maxDurationMin: 1,
        features: [
          "До 3 видео в месяц",
          "Длительность до 1 минуты",
          "Базовые голоса (4 шт.)",
          "Водяной знак НейроКлип",
          "Разрешение 720p",
        ],
        watermark: true,
        recommended: false,
      },
      {
        id: "standard",
        name: "Standard",
        tagline: "Для регулярного контента",
        priceMonthRub: 990,
        priceYearRub: 9900,
        videosPerMonth: 30,
        maxDurationMin: 5,
        features: [
          "До 30 видео в месяц",
          "Длительность до 5 минут",
          "Все базовые голоса",
          "Без водяного знака",
          "Разрешение 1080p",
          "Приоритетный рендер",
        ],
        watermark: false,
        recommended: true,
      },
      {
        id: "pro",
        name: "Pro",
        tagline: "Для студий и агентств",
        priceMonthRub: 2990,
        priceYearRub: 29900,
        videosPerMonth: 150,
        maxDurationMin: 120,
        features: [
          "До 150 видео в месяц",
          "Длительность до 2 часов",
          "Все голоса, включая премиум",
          "Без водяного знака",
          "Разрешение 4K",
          "Премиум-анимации и переходы",
          "API-доступ",
          "Приоритетная поддержка",
        ],
        watermark: false,
        recommended: false,
      },
    ])
    .onConflictDoUpdate({
      target: plansTable.id,
      set: {
        name: sql`EXCLUDED.name`,
        tagline: sql`EXCLUDED.tagline`,
        priceMonthRub: sql`EXCLUDED.price_month_rub`,
        priceYearRub: sql`EXCLUDED.price_year_rub`,
        videosPerMonth: sql`EXCLUDED.videos_per_month`,
        maxDurationMin: sql`EXCLUDED.max_duration_min`,
        features: sql`EXCLUDED.features`,
        watermark: sql`EXCLUDED.watermark`,
        recommended: sql`EXCLUDED.recommended`,
      },
    });

  await db
    .insert(promoCodesTable)
    .values([
      { code: "WELCOME100", discountType: "tokens", discountValue: 100, maxUses: 10000, isActive: true },
      { code: "NEUROBOOST", discountType: "tokens", discountValue: 500, maxUses: 1000, isActive: true },
    ])
    .onConflictDoNothing();
}
