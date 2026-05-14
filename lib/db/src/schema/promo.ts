import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

export const promoCodesTable = pgTable("Neyroclip_promo_codes", {
  code: text("code").primaryKey(),
  discountType: text("discount_type").notNull().default("tokens"),
  discountValue: integer("discount_value").notNull().default(0),
  maxUses: integer("max_uses").notNull().default(0),
  usedCount: integer("used_count").notNull().default(0),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
});

export type PromoCode = typeof promoCodesTable.$inferSelect;
