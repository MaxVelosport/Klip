import {
  pgTable,
  uuid,
  text,
  smallint,
  timestamp,
} from "drizzle-orm/pg-core";

export const renderJobsTable = pgTable("render_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  jobType: text("job_type").notNull(),
  status: text("status").notNull().default("pending"),
  progress: smallint("progress").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  retryCount: smallint("retry_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RenderJob = typeof renderJobsTable.$inferSelect;
