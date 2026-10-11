import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** False until the owner sets the two NEXT_PUBLIC_SUPABASE_* variables on Netlify. The site still builds and opens. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// One shared browser client for the whole app (session lives in cookies, so middleware sees it too).
// Placeholder values keep the build and the pages from crashing when the variables are missing.
export const supabase = createBrowserClient(
  supabaseUrl || "http://127.0.0.1:54321",
  supabaseAnonKey || "not-configured",
);

export type SupabaseClient = typeof supabase;
