import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const brandKitsTable = pgTable("Neyroclip_brand_kits", {
  userId: uuid("user_id").primaryKey(),
  brandName: text("brand_name").notNull().default(""),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull().default("#7c3aed"),
  accentColor: text("accent_color").notNull().default("#06b6d4"),
  fontChoice: text("font_choice").notNull().default("inter"),
  watermarkText: text("watermark_text").notNull().default(""),
  tagline: text("tagline").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type BrandKit = typeof brandKitsTable.$inferSelect;
export type InsertBrandKit = typeof brandKitsTable.$inferInsert;
