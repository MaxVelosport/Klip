// Snake_case DB row types matching Supabase REST API response shape.
// Use these wherever supabase-js returns untyped data.

export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  oauth_provider: string | null;
  oauth_id: string | null;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  role: string;
  plan_id: string;
  videos_used_this_period: number;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  topic_description: string;
  category: string;
  target_duration_sec: number;
  duration_sec: number;
  visual_style: string;
  voice_id: string;
  voice_speed: string;
  background_music_id: string | null;
  music_volume: number;
  add_subtitles: boolean;
  status: string;
  current_step: number;
  aspect_ratio: string;
  share_token: string | null;
  parent_project_id: string | null;
  final_video_url: string | null;
  thumbnail_url: string | null;
  error_message: string | null;
  image_provider: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Scene {
  id: string;
  project_id: string;
  order_index: number;
  title: string;
  narration: string;
  image_prompt: string;
  image_url: string | null;
  audio_url: string | null;
  duration_sec: string;
  animation_type: string;
  transition_type: string;
  updated_at: string;
}

export interface ScriptMessage {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  content: string;
  diff_summary: string | null;
  created_at: string;
}

export interface RenderJob {
  id: string;
  project_id: string;
  job_type: string;
  status: string;
  progress: number;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  yookassa_payment_id: string | null;
  amount_rub: string;
  status: string;
  purpose: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  succeeded_at: string | null;
}

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  price_month_rub: number;
  price_year_rub: number;
  videos_per_month: number;
  max_duration_min: number;
  features: string[];
  watermark: boolean;
  recommended: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
}

export interface TokenBalance {
  user_id: string;
  balance: number;
  updated_at: string;
}

export interface TokenTransaction {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  ref_id: string | null;
  created_at: string;
}

export interface PromoCode {
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export interface AuditLog {
  id: number;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function parseImagePrompt(raw: string): { ru: string; en: string } {
  try {
    const p = JSON.parse(raw) as unknown;
    if (p && typeof p === "object" && "ru" in p && "en" in p) {
      return { ru: String((p as { ru: unknown }).ru), en: String((p as { en: unknown }).en) };
    }
  } catch {
    // not JSON — treat as legacy plain string
  }
  return { ru: raw, en: raw };
}

export function serializeImagePrompt(ru: string, en: string): string {
  return JSON.stringify({ ru, en });
}

export interface BrandKit {
  user_id: string;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  font_choice: string;
  watermark_text: string;
  tagline: string;
  created_at: string;
  updated_at: string;
}
