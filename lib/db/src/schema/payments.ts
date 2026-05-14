import { pgTable, uuid, text, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";

export const paymentsTable = pgTable("Neyroclip_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  yookassaPaymentId: text("yookassa_payment_id"),
  amountRub: numeric("amount_rub", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("succeeded"),
  purpose: text("purpose").notNull(),
  description: text("description").notNull().default(""),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  succeededAt: timestamp("succeeded_at", { withTimezone: true }),
});

export type Payment = typeof paymentsTable.$inferSelect;
