import { runSQL } from "../../lib/db/src/run-sql.js";

(async () => {
  console.log("=== Stage 10 migration: add video_url + video_provider ===");

  await runSQL(`
    ALTER TABLE "Neyroclip_scenes"
    ADD COLUMN IF NOT EXISTS video_url TEXT;
  `);
  console.log("✅ Neyroclip_scenes.video_url added");

  await runSQL(`
    ALTER TABLE "Neyroclip_projects"
    ADD COLUMN IF NOT EXISTS video_provider TEXT DEFAULT 'ken-burns';
  `);
  console.log("✅ Neyroclip_projects.video_provider added");

  await runSQL("NOTIFY pgrst, 'reload schema';");
  console.log("✅ Schema reloaded");
})();
