// Edge Function: short-lived signed URLs for ID documents, for reviewers only. UNTESTED against a live project.
// 1) Calls request_identity_file_access() AS THE CALLER, which checks `identity.review` and writes the audit log.
// 2) Only then uses the service role to sign each file for 60 seconds.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "unauthorized" }, 401);

  const { submissionId } = await req.json().catch(() => ({}));
  if (typeof submissionId !== "string") return json({ error: "submissionId is required" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const asCaller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: files, error } = await asCaller.rpc("request_identity_file_access", { sid: submissionId });
  if (error || !files) {
    console.error("identity access denied", error?.message);
    return json({ error: "forbidden" }, 403);
  }

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const urls: Record<string, string> = {};
  for (const [kind, path] of Object.entries(files as Record<string, string>)) {
    const { data, error: signError } = await admin.storage.from("identity-docs").createSignedUrl(path, 60);
    if (signError || !data) { console.error("sign failed", kind, signError?.message); continue; }
    urls[kind] = data.signedUrl;
  }
  return json({ urls, expiresInSeconds: 60 });
});
