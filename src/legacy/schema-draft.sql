-- Future cloud storage. Apply in the user's selected project after review.
create table if not exists public.phone_saves (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 snapshot jsonb not null,
 updated_at timestamptz not null default now(),
 constraint snapshot_version check (snapshot->>'schemaVersion' = '1')
);
alter table public.phone_saves enable row level security;
create policy "Read own phone" on public.phone_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own phone" on public.phone_saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own phone" on public.phone_saves for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own phone" on public.phone_saves for delete to authenticated using ((select auth.uid()) = user_id);
-- Server approved scripts only: clients cannot supply arbitrary TTS text or voice IDs.
create table if not exists public.voice_scripts (
 id text primary key,
 text text not null check (char_length(text) between 1 and 2000),
 voice_id text not null,
 minimum_day integer not null default 1 check (minimum_day between 1 and 90)
);
alter table public.voice_scripts enable row level security;
-- No client read/write policy; only the server's service role reads scripts.
create table if not exists public.voice_usage (
 user_id uuid not null references auth.users(id) on delete cascade,
 bucket timestamptz not null,
 count integer not null default 1,
 primary key(user_id,bucket)
);
alter table public.voice_usage enable row level security;
create or replace function public.consume_voice_quota(p_user uuid) returns boolean language plpgsql security definer set search_path = public as $$
declare used integer;
begin
 insert into public.voice_usage(user_id,bucket,count) values(p_user,date_trunc('hour',now()),1)
 on conflict(user_id,bucket) do update set count=voice_usage.count+1 returning count into used;
 return used <= 20;
end;
$$;
revoke all on function public.consume_voice_quota(uuid) from public,anon,authenticated;
grant execute on function public.consume_voice_quota(uuid) to service_role;
