const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) throw new Error("SUPABASE_URL required");
if (!SUPABASE_SERVICE_KEY) throw new Error("SUPABASE_SERVICE_KEY required");

const baseUrl = SUPABASE_URL.replace(/\/+$/, "");

export async function runSQL(query: string): Promise<unknown> {
  const r = await fetch(`${baseUrl}/pg/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY!}`,
    },
    body: JSON.stringify({ query }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`SQL failed: ${r.status} ${text.slice(0, 500)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
