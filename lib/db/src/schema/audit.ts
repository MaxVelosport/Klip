import { pgTable, bigserial, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const auditLogTable = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: uuid("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull().default(""),
  entityId: text("entity_id"),
  message: text("message").notNull().default(""),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogTable.$inferSelect;
