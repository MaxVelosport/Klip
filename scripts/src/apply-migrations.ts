import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { runSQL } from "../../lib/db/src/run-sql.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_DIR = join(__dirname, "..", "..", "sql");

const files = ["01_tables.sql", "02_rpc.sql", "03_views.sql"];

(async () => {
  for (const f of files) {
    const sql = readFileSync(join(SQL_DIR, f), "utf-8");
    console.log(`\n=== Applying ${f} (${sql.length} chars) ===`);
    try {
      await runSQL(sql);
      console.log(`✅ ${f}: OK`);
    } catch (e: any) {
      console.error(`❌ ${f}: ${e.message}`);
      process.exit(1);
    }
  }

  await runSQL("NOTIFY pgrst, 'reload schema';");
  console.log("\n✅ Schema reloaded");

  const tables = await runSQL(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name LIKE 'Neyroclip_%'
     ORDER BY table_name;`,
  );
  console.log("\n=== Tables in public schema ===");
  console.log(JSON.stringify(tables, null, 2));

  const rpcs = await runSQL(
    `SELECT routine_name FROM information_schema.routines
     WHERE routine_schema='public' AND routine_name LIKE 'neyroclip_%'
     ORDER BY routine_name;`,
  );
  console.log("\n=== RPC functions ===");
  console.log(JSON.stringify(rpcs, null, 2));
})();
