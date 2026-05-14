import { pgTable, uuid, integer, text, timestamp } from "drizzle-orm/pg-core";

export const tokenBalancesTable = pgTable("Neyroclip_token_balances", {
  userId: uuid("user_id").primaryKey(),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const tokenTransactionsTable = pgTable("Neyroclip_token_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  refId: text("ref_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TokenTransaction = typeof tokenTransactionsTable.$inferSelect;
