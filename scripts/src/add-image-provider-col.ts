import { runSQL } from "../../lib/db/src/run-sql.js";

const sql = `ALTER TABLE "Neyroclip_projects" ADD COLUMN IF NOT EXISTS image_provider TEXT DEFAULT 'nano-banana-flash';`;
const result = await runSQL(sql);
console.log("Migration result:", JSON.stringify(result));
await runSQL("NOTIFY pgrst, 'reload schema';");
console.log("Schema reloaded");
