import { createClient } from "npm:@supabase/supabase-js@2.95.0";

type Json = Record<string, unknown>;
const endpoint = Deno.env.get("SUPABASE_URL") ?? "";
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}") as Record<string, string>;
const key = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const admin = createClient(endpoint, key, { auth: { autoRefreshToken: false, persistSession: false } });
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
const respond = (status: number, body: Json) => new Response(JSON.stringify(body), { status, headers });
const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const validId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{8,120}$/.test(v);

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return respond(405, { error: "method_not_allowed" });
  if (!key || !endpoint) return respond(503, { error: "server_not_ready" });
  const bearer = req.headers.get("Authorization") || "";
  const token = bearer.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return respond(401, { error: "sign_in_required" });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return respond(401, { error: "invalid_session" });
  const userId = auth.user.id;

  try {
    const raw = await req.text();
    if (raw.length > 18000) return respond(413, { error: "payload_too_large" });
    const body = JSON.parse(raw) as Json;
    if (!body || typeof body !== "object" || Array.isArray(body)) return respond(400, { error: "invalid_body" });
    const op = body.op;
    if (op === "status") {
      return respond(200, { ok: true, service: "ximeng-tai-brain", version: 1, mode: "foundation", ai_connected: Boolean(Deno.env.get("DEEPSEEK_API_KEY")) });
    }
    if (op === "bootstrap") {
      const slot = Number(body.slot ?? 1);
      if (!Number.isInteger(slot) || slot < 1 || slot > 5) return respond(400, { error: "invalid_slot" });
      let { data: save, error: lookupError } = await admin.from("game_saves").select("id,slot,timeline_version,story_day,game_clock,view_phase")
        .eq("user_id", userId).eq("slot", slot).maybeSingle();
      if (lookupError) return respond(500, { error: "save_lookup_failed" });
      if (!save) {
        const created = await admin.from("game_saves").insert({ user_id: userId, slot, timeline_version: "55-v1", story_day: 1, game_clock: "09:00" })
          .select("id,slot,timeline_version,story_day,game_clock,view_phase").single();
        if (created.error) {
          // Safe under concurrent calls: re-read the unique (user_id, slot) row.
          const retry = await admin.from("game_saves").select("id,slot,timeline_version,story_day,game_clock,view_phase")
            .eq("user_id", userId).eq("slot", slot).maybeSingle();
          if (retry.error || !retry.data) return respond(500, { error: "save_create_failed" });
          save = retry.data;
        } else save = created.data;
      }
      const profile = await admin.from("tai_profiles").upsert({ save_id: save!.id }, { onConflict: "save_id", ignoreDuplicates: true });
      if (profile.error) return respond(500, { error: "profile_init_failed" });
      return respond(200, { ok: true, save });
    }

    if (!uuid(body.save_id)) return respond(400, { error: "invalid_save_id" });
    // Ownership check BEFORE every privileged database read or write.
    const { data: save, error: saveError } = await admin.from("game_saves")
      .select("id,user_id,story_day,game_clock,view_phase,timeline_version")
      .eq("id", body.save_id).eq("user_id", userId).maybeSingle();
    if (saveError) return respond(500, { error: "save_lookup_failed" });
    if (!save) return respond(404, { error: "save_not_found" });

    if (op === "snapshot") {
      const [profile, messages, actions] = await Promise.all([
        admin.from("tai_profiles").select("identity_phase,relationship_score,mood,availability,life_state,last_game_day,last_game_clock").eq("save_id", save.id).maybeSingle(),
        admin.from("tai_messages").select("id,channel,sender,kind,content,read_state,game_day,game_clock,created_at").eq("save_id", save.id).order("created_at", { ascending: false }).limit(40),
        admin.from("tai_actions").select("id,action_kind,clock_kind,due_at,due_game_day,due_game_clock,status").eq("save_id", save.id).eq("status", "pending").limit(20),
      ]);
      if (profile.error || messages.error || actions.error) return respond(500, { error: "snapshot_failed" });
      return respond(200, {
        ok: true, save: { id: save.id, story_day: save.story_day, game_clock: save.game_clock, view_phase: save.view_phase },
        tai: profile.data, messages: (messages.data ?? []).reverse(), pending_actions: actions.data ?? [],
      });
    }

    if (op === "submit_message") {
      const channel = body.channel;
      const content = typeof body.content === "string" ? body.content.trim() : "";
      if (!["noapp", "mirage", "chess"].includes(String(channel)) ||
          !content || content.length > 3000 || !validId(body.client_event_id))
        return respond(400, { error: "invalid_message" });
      const { data: profile, error: profileError } = await admin.from("tai_profiles")
        .select("identity_phase").eq("save_id", save.id).maybeSingle();
      if (profileError || !profile) return respond(409, { error: "profile_not_initialized" });
      // Client cannot bypass the recognition stage by sending arbitrary scene flags.
      if (channel !== "mirage" && profile.identity_phase !== "recognized")
        return respond(423, { error: "story_stage_locked" });
      // Back-end rate-limit guard; infrastructure/API-level rate limiting should be added before public launch.
      const since = new Date(Date.now() - 60_000).toISOString();
      const { count } = await admin.from("tai_messages").select("id", { count: "exact", head: true })
        .eq("save_id", save.id).eq("sender", "player").gte("created_at", since);
      if ((count ?? 0) >= 20) return respond(429, { error: "too_many_messages" });
      const message = {
        save_id: save.id, channel, sender: "player", kind: "text", content,
        read_state: "unread", client_event_id: body.client_event_id,
        game_day: save.story_day, game_clock: save.game_clock,
      };
      const { data: inserted, error: insertError } = await admin.from("tai_messages").insert(message)
        .select("id,channel,sender,kind,content,read_state,game_day,game_clock,created_at").single();
      if (insertError?.code === "23505") {
        const { data: existing } = await admin.from("tai_messages")
          .select("id,channel,sender,kind,content,read_state,game_day,game_clock,created_at")
          .eq("save_id", save.id).eq("client_event_id", body.client_event_id).maybeSingle();
        if (existing && existing.channel === channel && existing.content === content)
          return respond(200, { ok: true, duplicate: true, message: existing, ai_status: "not_activated" });
        return respond(409, { error: "event_id_conflict" });
      }
      if (insertError) return respond(500, { error: "message_persist_failed" });
      // Deliberately do NOT fabricate an AI reply or execute a voice/call action.
      // Two-stage director, worldbook and provider secrets are wired in the next integration step.
      return respond(202, { ok: true, message: inserted, ai_status: "not_activated" });
    }
    return respond(400, { error: "unknown_operation" });
  } catch (e) {
    if (e instanceof SyntaxError) return respond(400, { error: "invalid_json" });
    // Never leak service keys, tokens, SQL or user chat logs in error text.
    return respond(500, { error: "internal_error" });
  }
});
