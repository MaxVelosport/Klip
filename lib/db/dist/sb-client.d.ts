import { SupabaseClient } from "@supabase/supabase-js";
export declare function getSupabase(): SupabaseClient;
export declare const TABLE: {
    readonly users: "Neyroclip_users";
    readonly sessions: "Neyroclip_sessions";
    readonly projects: "Neyroclip_projects";
    readonly scenes: "Neyroclip_scenes";
    readonly scriptMessages: "Neyroclip_script_messages";
    readonly renderJobs: "Neyroclip_render_jobs";
    readonly payments: "Neyroclip_payments";
    readonly plans: "Neyroclip_plans";
    readonly subscriptions: "Neyroclip_subscriptions";
    readonly tokenBalances: "Neyroclip_token_balances";
    readonly tokenTransactions: "Neyroclip_token_transactions";
    readonly promoCodes: "Neyroclip_promo_codes";
    readonly auditLog: "Neyroclip_audit_log";
    readonly brandKits: "Neyroclip_brand_kits";
};
export type TableName = (typeof TABLE)[keyof typeof TABLE];
export declare function sbFrom(table: TableName): import("@supabase/supabase-js").PostgrestQueryBuilder<any, any, any, TableName, unknown>;
export declare function sbRpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<{
    data: T | null;
    error: {
        message: string;
        code?: string;
    } | null;
}>;
//# sourceMappingURL=sb-client.d.ts.map