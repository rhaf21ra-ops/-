// Server route (runs on Netlify): short-lived signed URLs for ID photos, for staff reviewers only.
// 1) Calls request_identity_file_access() AS THE CALLER. It checks the `identity.review` permission and writes the audit log.
// 2) Only after that does it use the service-role key (server-only env var) to sign each file for 60 seconds.
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return NextResponse.json({ error: "server is not configured" }, { status: 500 });

  const auth = req.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const submissionId = (body as { submissionId?: unknown }).submissionId;
  if (typeof submissionId !== "string") return NextResponse.json({ error: "submissionId is required" }, { status: 400 });

  const asCaller = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: files, error } = await asCaller.rpc("request_identity_file_access", { sid: submissionId });
  if (error || !files) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const urls: Record<string, string> = {};
  for (const [kind, path] of Object.entries(files as Record<string, string>)) {
    const { data, error: signError } = await admin.storage.from("identity-docs").createSignedUrl(path, 86400);
    if (!signError && data) urls[kind] = data.signedUrl;
  }
  return NextResponse.json({ urls, expiresInSeconds: 86400 }, { headers: { "Cache-Control": "no-store" } });
}
