import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const scriptMessagesTable = pgTable("Neyroclip_script_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  userId: uuid("user_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  diffSummary: text("diff_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ScriptMessage = typeof scriptMessagesTable.$inferSelect;
export type InsertScriptMessage = typeof scriptMessagesTable.$inferInsert;
