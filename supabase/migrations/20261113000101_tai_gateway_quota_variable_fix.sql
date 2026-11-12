create or replace function public.reserve_tai_ai_gateway_quota(
 p_user uuid,p_kind text
) returns boolean language plpgsql security definer
set search_path = pg_catalog,public
as $$
declare
  per_user_limit integer;
  total_limit integer;
  v_bucket text;
  v_quota_limit integer;
begin
  if p_user is null or p_kind not in ('chat','decision','tts') then
    return false;
  end if;
  per_user_limit := case p_kind when 'chat' then 30 when 'decision' then 20 else 10 end;
  total_limit := case p_kind when 'chat' then 160 when 'decision' then 90 else 45 end;
  -- Each operation consumes the global shared daily cost ceiling too.
  for v_bucket, v_quota_limit in
    select 'global:all',270
    union all select 'global:'||p_kind,total_limit
    union all select 'user:'||p_user::text||':'||p_kind,per_user_limit
  loop
    insert into public.tai_ai_gateway_quotas(bucket,day_utc,used)
    values(v_bucket,(now() at time zone 'utc')::date,1)
    on conflict (bucket,day_utc) do update set used=public.tai_ai_gateway_quotas.used+1
    where public.tai_ai_gateway_quotas.used < v_quota_limit;
    if not found then
      raise exception 'daily_quota_exceeded' using errcode='P0001';
    end if;
  end loop;
  return true;
end $$;
