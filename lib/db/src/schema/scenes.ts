import {
  pgTable,
  uuid,
  text,
  smallint,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

export const scenesTable = pgTable("Neyroclip_scenes", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  orderIndex: smallint("order_index").notNull().default(0),
  title: text("title").notNull().default(""),
  narration: text("narration").notNull().default(""),
  imagePrompt: text("image_prompt").notNull().default(""),
  imageUrl: text("image_url"),
  audioUrl: text("audio_url"),
  durationSec: numeric("duration_sec", { precision: 6, scale: 2 }).notNull().default("6.00"),
  animationType: text("animation_type").notNull().default("ken_burns_zoom_in"),
  transitionType: text("transition_type").notNull().default("fade"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Scene = typeof scenesTable.$inferSelect;
export type InsertScene = typeof scenesTable.$inferInsert;
