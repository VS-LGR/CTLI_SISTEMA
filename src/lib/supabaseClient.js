import { createClient } from "@supabase/supabase-js";

const url = (process.env.REACT_APP_SUPABASE_URL || "").trim();
const anonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || "").trim();

/** True when public Supabase env vars are set (browser). */
export const isSupabaseConfigured = Boolean(url && anonKey);

/** Singleton; only valid when `isSupabaseConfigured`. */
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
