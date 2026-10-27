// Edge Function: short-lived signed URLs for ID documents, for reviewers only.
// 1) Calls request_identity_file_access() AS THE CALLER, which checks `identity.review` and writes the audit log.
// 2) Only then uses the service role to sign each file for 60 seconds.
// v2: full CORS headers, try/catch, proper error handling.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.toLowerCase().startsWith("bearer "))
      return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const submissionId = (body as { submissionId?: unknown }).submissionId;
    if (typeof submissionId !== "string")
      return json({ error: "submissionId is required" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!url || !anonKey || !serviceKey)
      return json({ error: "server is not configured" }, 500);

    const asCaller = createClient(url, anonKey, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });

    const { data: files, error } = await asCaller.rpc("request_identity_file_access", {
      sid: submissionId,
    });
    if (error || !files) {
      console.error("identity access denied", error?.message);
      return json({ error: "forbidden" }, 403);
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const urls: Record<string, string> = {};
    for (const [kind, path] of Object.entries(files as Record<string, string>)) {
      const { data, error: signError } = await admin
        .storage
        .from("identity-docs")
        .createSignedUrl(path, 60);
      if (signError || !data) {
        console.error("sign failed", kind, signError?.message);
        continue;
      }
      urls[kind] = data.signedUrl;
    }

    if (Object.keys(urls).length === 0)
      return json({ error: "no images could be loaded" }, 500);

    return json({ urls, expiresInSeconds: 60 });
  } catch (err) {
    console.error("identity-file-url error", err);
    return json({ error: "internal server error" }, 500);
  }
});
