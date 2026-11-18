-- One-time private tester enrollment; public gameplay phrase is never a cloud authorization.
create table if not exists public.tai_private_test_access (
 code_hash text primary key check (code_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null,
 user_id uuid unique references auth.users(id) on delete cascade,
 redeemed_at timestamptz
);
alter table public.tai_private_test_access enable row level security;
revoke all on public.tai_private_test_access from public,anon,authenticated;
grant select,insert,update on public.tai_private_test_access to service_role;

create or replace function public.redeem_tai_private_test_access(p_user uuid,p_hash text)
returns boolean language plpgsql security invoker set search_path = pg_catalog,public
as $$
begin
 if p_user is null or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then return false; end if;
 if exists(select 1 from public.tai_private_test_access where code_hash=p_hash and user_id=p_user) then return true; end if;
 update public.tai_private_test_access
 set user_id=p_user, redeemed_at=now()
 where code_hash=p_hash and user_id is null and expires_at>now();
 return found;
exception when unique_violation then return false;
end $$;
revoke all on function public.redeem_tai_private_test_access(uuid,text) from public,anon,authenticated;
grant execute on function public.redeem_tai_private_test_access(uuid,text) to service_role;

create or replace function public.reserve_tai_ai_gateway_quota(p_user uuid,p_kind text)
returns boolean language plpgsql security invoker set search_path = pg_catalog,public
as $$
declare
 per_user_limit integer;
 total_limit integer;
 v_bucket text;
 v_quota_limit integer;
 is_tester boolean;
begin
 if p_user is null or p_kind not in ('chat','decision','tts') then return false; end if;
 select exists(select 1 from public.tai_private_test_access where user_id=p_user) into is_tester;
 if is_tester then
  per_user_limit := case p_kind when 'chat' then 150 when 'decision' then 100 else 300 end;
 else
  per_user_limit := case p_kind when 'chat' then 30 when 'decision' then 20 else 10 end;
 end if;
 total_limit := case p_kind when 'chat' then 160 when 'decision' then 90 else 45 end;
 -- Private testers have a separate bounded cost envelope. Public users
 -- retain the original per-user and shared quotas and cannot consume it.
 for v_bucket,v_quota_limit in
  select 'tester:'||p_user::text||':all',500 where is_tester
  union all select 'tester:'||p_user::text||':'||p_kind,per_user_limit where is_tester
  union all select 'global:all',270 where not is_tester
  union all select 'global:'||p_kind,total_limit where not is_tester
  union all select 'user:'||p_user::text||':'||p_kind,per_user_limit where not is_tester
 loop
  insert into public.tai_ai_gateway_quotas(bucket,day_utc,used)
  values(v_bucket,(now() at time zone 'utc')::date,1)
  on conflict (bucket,day_utc) do update set used=public.tai_ai_gateway_quotas.used+1
  where public.tai_ai_gateway_quotas.used < v_quota_limit;
  if not found then raise exception 'daily_quota_exceeded' using errcode='P0001'; end if;
 end loop;
 return true;
end $$;
revoke all on function public.reserve_tai_ai_gateway_quota(uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_tai_ai_gateway_quota(uuid,text) to service_role;
