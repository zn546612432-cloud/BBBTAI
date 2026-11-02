
-- Ximeng Phone AI backend v1. Player-owned saves; all character internals are server-owned.
create extension if not exists pgcrypto with schema extensions;

create table public.game_saves (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 slot smallint not null default 1 check (slot between 1 and 5),
 title text not null default '熙蒙的手机' check (length(title) between 1 and 80),
 timeline_version text not null default '55-v1' check (timeline_version in ('55-v1','legacy-90')),
 story_day smallint not null default 1 check (story_day between 1 and 90),
 game_clock text not null default '09:00' check (game_clock ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 view_phase text not null default 'ximeng' check (view_phase in ('ximeng','xitai')),
 game_state jsonb not null default '{}'::jsonb check (jsonb_typeof(game_state) = 'object'),
 revision integer not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id, slot)
);
create index game_saves_user_recent_idx on public.game_saves(user_id,updated_at desc);
alter table public.game_saves enable row level security;
create policy "save_owner_read" on public.game_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy "save_owner_insert" on public.game_saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "save_owner_update" on public.game_saves for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "save_owner_delete" on public.game_saves for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.game_saves from anon, authenticated;
grant select, insert, update, delete on public.game_saves to authenticated;

create table public.tai_profiles (
 save_id uuid primary key references public.game_saves(id) on delete cascade,
 identity_phase text not null default 'anonymous' check (identity_phase in ('anonymous','recognized','finale')),
 relationship_score smallint not null default 30 check (relationship_score between 0 and 100),
 relationship_axes jsonb not null default '{}'::jsonb check (jsonb_typeof(relationship_axes) = 'object'),
 mood text not null default 'neutral' check (length(mood) between 1 and 64),
 mood_context text not null default '' check (length(mood_context) <= 1500),
 life_state jsonb not null default '{}'::jsonb check (jsonb_typeof(life_state) = 'object'),
 availability text not null default 'unknown' check (availability in ('unknown','available','busy','away','asleep')),
 current_location text not null default '' check (length(current_location) <= 160),
 state_version integer not null default 1 check (state_version > 0),
 last_game_day smallint not null default 1,
 last_game_clock text not null default '09:00',
 updated_at timestamptz not null default now()
);
create table public.tai_messages (
 id uuid primary key default gen_random_uuid(),
 save_id uuid not null references public.game_saves(id) on delete cascade,
 channel text not null check (channel in ('noapp','mirage','chess','call')),
 sender text not null check (sender in ('player','tai','system')),
 kind text not null default 'text' check (kind in ('text','voice','call_event','status')),
 content text not null default '' check (length(content) <= 6000),
 read_state text not null default 'unread' check (read_state in ('unread','read','deferred','none')),
 voice_object_path text,
 client_event_id text check (length(client_event_id) <= 128),
 game_day smallint not null check (game_day between 1 and 90),
 game_clock text not null check (game_clock ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(save_id,client_event_id)
);
create index tai_messages_save_time_idx on public.tai_messages(save_id,created_at desc,id);
create index tai_messages_unread_idx on public.tai_messages(save_id,read_state) where read_state in ('unread','deferred');

create table public.tai_memories (
 id uuid primary key default gen_random_uuid(),
 save_id uuid not null references public.game_saves(id) on delete cascade,
 category text not null check (category in ('person','bond','event','preference','commitment','life','story')),
 reliability text not null default 'reported' check (reliability in ('canonical','observed','reported','inferred','planned')),
 channel_scope text not null default 'shared' check (channel_scope in ('shared','mirage','noapp','chess')),
 summary text not null check (length(summary) between 1 and 2000),
 importance smallint not null default 50 check (importance between 0 and 100),
 origin_message_id uuid references public.tai_messages(id) on delete set null,
 first_game_day smallint not null default 1,
 archived boolean not null default false,
 created_at timestamptz not null default now()
);
create index tai_memories_save_active_idx on public.tai_memories(save_id,importance desc,created_at desc) where not archived;

create table public.tai_actions (
 id uuid primary key default gen_random_uuid(),
 save_id uuid not null references public.game_saves(id) on delete cascade,
 source_message_id uuid references public.tai_messages(id) on delete set null,
 action_kind text not null check (action_kind in ('send_text','send_voice','start_call','mark_read','defer_reply','end_session','update_life')),
 payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
 clock_kind text not null check (clock_kind in ('real','game')),
 due_at timestamptz,
 due_game_day smallint,
 due_game_clock text,
 status text not null default 'pending' check (status in ('pending','processing','done','cancelled','failed','expired')),
 idempotency_key text not null check (length(idempotency_key) between 1 and 180),
 attempts smallint not null default 0 check (attempts between 0 and 20),
 locked_at timestamptz,
 executed_at timestamptz,
 created_at timestamptz not null default now(),
 unique(save_id,idempotency_key),
 constraint tai_actions_due_valid check (
  (clock_kind = 'real' and due_at is not null and due_game_day is null and due_game_clock is null)
  or (clock_kind = 'game' and due_at is null and due_game_day between 1 and 90 and due_game_clock ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
 )
);
create index tai_actions_pending_real_idx on public.tai_actions(due_at) where status='pending' and clock_kind='real';
create index tai_actions_pending_game_idx on public.tai_actions(save_id,due_game_day,due_game_clock) where status='pending' and clock_kind='game';

create table public.tai_decisions (
 id uuid primary key default gen_random_uuid(),
 save_id uuid not null references public.game_saves(id) on delete cascade,
 source_message_id uuid references public.tai_messages(id) on delete set null,
 action_kind text not null check (action_kind in ('send_text','send_voice','start_call','mark_read','defer_reply','end_session','update_life')),
 strategy text not null default 'neutral' check (length(strategy) between 1 and 60),
 intent text not null default '' check (length(intent) <= 600),
 result text not null default 'proposed' check (result in ('proposed','approved','blocked','executed','failed')),
 reason_code text not null default '',
 model_id text not null default '',
 created_at timestamptz not null default now()
);
create index tai_decisions_save_time_idx on public.tai_decisions(save_id,created_at desc);

create table public.tai_relationship_events (
 id uuid primary key default gen_random_uuid(),
 save_id uuid not null references public.game_saves(id) on delete cascade,
 source_message_id uuid references public.tai_messages(id) on delete set null,
 axis text not null check (axis in ('trust','warmth','conflict','closeness','safety')),
 delta smallint not null check (delta between -10 and 10),
 rationale text not null default '' check (length(rationale) <= 400),
 created_at timestamptz not null default now()
);
create index tai_relationship_save_time_idx on public.tai_relationship_events(save_id,created_at desc);

-- Character state is managed ONLY by authenticated server functions.
-- RLS enabled everywhere; clients have no table privileges for AI internal rows.
do $$
declare tab text;
begin
 foreach tab in array array['tai_profiles','tai_messages','tai_memories','tai_actions','tai_decisions','tai_relationship_events']
 loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from anon, authenticated',tab);
  execute format('grant select, insert, update, delete on public.%I to service_role',tab);
 end loop;
end $$;

comment on table public.game_saves is 'Player-owned game save slots. Never overwrite existing local story content during migration.';
comment on table public.tai_profiles is 'Server-only authoritative Chen Xitai state per save.';
comment on table public.tai_actions is 'Durable, idempotent AI side effects; game-time events must never fast-forward main plot on their own.';
