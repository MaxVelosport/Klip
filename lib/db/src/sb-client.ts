import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required");
if (!SUPABASE_SERVICE_KEY) throw new Error("SUPABASE_SERVICE_KEY is required");

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: "public" },
    });
  }
  return _client;
}

export const TABLE = {
  users: "Neyroclip_users",
  sessions: "Neyroclip_sessions",
  projects: "Neyroclip_projects",
  scenes: "Neyroclip_scenes",
  scriptMessages: "Neyroclip_script_messages",
  renderJobs: "Neyroclip_render_jobs",
  payments: "Neyroclip_payments",
  plans: "Neyroclip_plans",
  subscriptions: "Neyroclip_subscriptions",
  tokenBalances: "Neyroclip_token_balances",
  tokenTransactions: "Neyroclip_token_transactions",
  promoCodes: "Neyroclip_promo_codes",
  auditLog: "Neyroclip_audit_log",
  brandKits: "Neyroclip_brand_kits",
} as const;

export type TableName = (typeof TABLE)[keyof typeof TABLE];

export function sbFrom(table: TableName) {
  return getSupabase().from(table);
}

export function sbRpc<T = unknown>(
  fn: string,
  args?: Record<string, unknown>,
) {
  return getSupabase().rpc(fn, args) as unknown as Promise<{
    data: T | null;
    error: { message: string; code?: string } | null;
  }>;
}
