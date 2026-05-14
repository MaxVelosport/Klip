import {
  pgTable,
  uuid,
  text,
  integer,
  smallint,
  timestamp,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";

export const projectsTable = pgTable("Neyroclip_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  topicDescription: text("topic_description").notNull().default(""),
  category: text("category").notNull().default("educational"),
  targetDurationSec: integer("target_duration_sec").notNull().default(180),
  durationSec: integer("duration_sec").notNull().default(0),
  visualStyle: text("visual_style").notNull().default("realism"),
  voiceId: text("voice_id").notNull().default("baya"),
  voiceSpeed: numeric("voice_speed", { precision: 3, scale: 2 }).notNull().default("1.00"),
  backgroundMusicId: text("background_music_id"),
  musicVolume: integer("music_volume").notNull().default(35),
  addSubtitles: boolean("add_subtitles").notNull().default(true),
  status: text("status").notNull().default("draft"),
  currentStep: smallint("current_step").notNull().default(1),
  aspectRatio: text("aspect_ratio").notNull().default("16:9"),
  shareToken: text("share_token").unique(),
  parentProjectId: uuid("parent_project_id"),
  finalVideoUrl: text("final_video_url"),
  thumbnailUrl: text("thumbnail_url"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type Project = typeof projectsTable.$inferSelect;
export type InsertProject = typeof projectsTable.$inferInsert;
