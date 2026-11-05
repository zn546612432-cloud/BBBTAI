// Read-only public V8 persona feed. Never returns player saves, memories or secret keys.
// The private tai-brain JWT-gated backend remains authoritative for player data.
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const PROJECT_URL = Deno.env.get("SUPABASE_URL") || "";
function serviceKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    return typeof keys.default === "string" ? keys.default : (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  } catch { return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""; }
}
const KEY = serviceKey();
const db = KEY && PROJECT_URL
  ? createClient(PROJECT_URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=60",
  "X-Content-Type-Options": "nosniff",
};
const json = (status: number, result: object) =>
  new Response(JSON.stringify(result), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "GET") return json(405, { error: "method_not_allowed" });
  if (!db) return json(503, { error: "persona_service_not_configured" });
  try {
    // Fixed, reviewed selection: no caller-supplied table, key, ID or SQL.
    const { data, error } = await db.from("tai_character_bibles")
      .select("version,title,status,content,updated_at")
      .eq("character_key", "chen_xitai")
      .eq("version", "v8-b-2026-11-05")
      .eq("status", "approved")
      .maybeSingle();
    if (error) return json(503, { error: "persona_query_unavailable" });
    if (!data?.content || typeof data.content !== "object") {
      return json(404, { error: "approved_persona_missing" });
    }
    // Approved authoring rules are public like the existing GitHub worldbook.
    // Do NOT add any save/user data to this response.
    const c = data.content;
    return json(200, {
      ok: true,
      character_key: "chen_xitai",
      version: data.version,
      title: data.title,
      updated_at: data.updated_at,
      content: {
        character: c.character,
        personality: c.personality,
        speech: c.speech,
        relationship: c.relationship,
        memory: c.memory,
        behavior: c.behavior,
        voice: c.voice,
        examples: c.examples,
      },
    });
  } catch {
    return json(500, { error: "persona_service_error" });
  }
});
