import { runSQL } from "../../lib/db/src/run-sql.js";

await runSQL(`ALTER TABLE "Neyroclip_projects" ADD COLUMN IF NOT EXISTS tts_provider TEXT DEFAULT 'salute-speech';`);
console.log("✓ tts_provider column added");
await runSQL("NOTIFY pgrst, 'reload schema';");
console.log("✓ schema reloaded");
