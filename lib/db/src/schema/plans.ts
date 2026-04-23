import { pgTable, text, integer, jsonb, boolean } from "drizzle-orm/pg-core";

export const plansTable = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  priceMonthRub: integer("price_month_rub").notNull().default(0),
  priceYearRub: integer("price_year_rub").notNull().default(0),
  videosPerMonth: integer("videos_per_month").notNull().default(0),
  maxDurationMin: integer("max_duration_min").notNull().default(1),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  watermark: boolean("watermark").notNull().default(true),
  recommended: boolean("recommended").notNull().default(false),
});

export type Plan = typeof plansTable.$inferSelect;
