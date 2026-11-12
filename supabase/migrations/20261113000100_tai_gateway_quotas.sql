-- Production AI key protection. No client grants: the service-role Edge
-- Function alone can atomically reserve a bounded number of paid calls.
create table if not exists public.tai_ai_gateway_quotas (
 bucket text not null,
 day_utc date not null default (now() at time zone 'utc')::date,
 used integer not null default 0 check (used >= 0),
 primary key (bucket,day_utc)
);
alter table public.tai_ai_gateway_quotas enable row level security;
revoke all on public.tai_ai_gateway_quotas from public,anon,authenticated;
grant select,insert,update on public.tai_ai_gateway_quotas to service_role;

create or replace function public.reserve_tai_ai_gateway_quota(
 p_user uuid,p_kind text
) returns boolean language plpgsql security definer
set search_path = pg_catalog,public
as $$
declare
  per_user_limit integer;
  total_limit integer;
  bucket text;
  quota_limit integer;
begin
  if p_user is null or p_kind not in ('chat','decision','tts') then
    return false;
  end if;
  per_user_limit := case p_kind when 'chat' then 30 when 'decision' then 20 else 10 end;
  total_limit := case p_kind when 'chat' then 160 when 'decision' then 90 else 45 end;
  -- Each operation consumes the global shared daily cost ceiling too.
  for bucket, quota_limit in
    select 'global:all',270
    union all select 'global:'||p_kind,total_limit
    union all select 'user:'||p_user::text||':'||p_kind,per_user_limit
  loop
    insert into public.tai_ai_gateway_quotas(bucket,day_utc,used)
    values(bucket,(now() at time zone 'utc')::date,1)
    on conflict (bucket,day_utc) do update set used=public.tai_ai_gateway_quotas.used+1
    where public.tai_ai_gateway_quotas.used < quota_limit;
    if not found then
      raise exception 'daily_quota_exceeded' using errcode='P0001';
    end if;
  end loop;
  return true;
end $$;
revoke all on function public.reserve_tai_ai_gateway_quota(uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_tai_ai_gateway_quota(uuid,text) to service_role;
comment on table public.tai_ai_gateway_quotas is
 'Atomic bounded quota reservations for authenticated Supabase Edge AI gateway. Never expose publicly.';
