import { sbFrom, TABLE, type Plan, type PromoCode } from "@workspace/db";

export async function seedStaticData() {
  const plans: Plan[] = [
    {
      id: "free",
      name: "Free",
      tagline: "Попробовать без вложений",
      price_month_rub: 0,
      price_year_rub: 0,
      videos_per_month: 3,
      max_duration_min: 1,
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
      price_month_rub: 990,
      price_year_rub: 9900,
      videos_per_month: 30,
      max_duration_min: 5,
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
      price_month_rub: 2990,
      price_year_rub: 29900,
      videos_per_month: 150,
      max_duration_min: 120,
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
  ];

  await sbFrom(TABLE.plans).upsert(plans, { onConflict: "id" });

  const promoCodes: Pick<PromoCode, "code" | "discount_type" | "discount_value" | "max_uses" | "is_active">[] = [
    { code: "WELCOME100", discount_type: "tokens", discount_value: 100, max_uses: 10000, is_active: true },
    { code: "NEUROBOOST", discount_type: "tokens", discount_value: 500, max_uses: 1000, is_active: true },
  ];

  await sbFrom(TABLE.promoCodes).upsert(promoCodes, { onConflict: "code", ignoreDuplicates: true });
}
