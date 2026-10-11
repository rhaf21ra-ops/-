import { supabase } from "@/lib/supabase-client";

/** Same shared browser client as lib/supabase-client.ts, so every component sees the same session. */
export const createClient = () => supabase;
