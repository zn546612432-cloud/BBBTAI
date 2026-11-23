-- One authenticated player owns the production save (slot 1). Slot 2 is
-- reserved for opt-in preview QA; it can never overwrite the production slot.
-- Additive migration: existing game_saves schema, rows and policies stay intact.
-- Three backup slots are reused; no existing save is deleted.

create table public.game_save_backups (
 save_id uuid not null references public.game_saves(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 backup_slot smallint not null check (backup_slot between 1 and 3),
 revision integer not null check (revision > 0),
 game_state jsonb not null,
 saved_at timestamptz not null default now(),
 primary key (save_id, backup_slot)
);
alter table public.game_save_backups enable row level security;
create policy backup_owner_read on public.game_save_backups for select to authenticated
 using ((select auth.uid())=user_id);
create policy backup_owner_insert on public.game_save_backups for insert to authenticated
 with check ((select auth.uid())=user_id and exists (
  select 1 from public.game_saves s where s.id=save_id and s.user_id=(select auth.uid())));
create policy backup_owner_update on public.game_save_backups for update to authenticated
 using ((select auth.uid())=user_id)
 with check ((select auth.uid())=user_id);
revoke all on public.game_save_backups from public, anon, authenticated;
grant select, insert, update on public.game_save_backups to authenticated;

create function public.sync_phone_save(p_slot integer,p_expected_revision integer,p_write_id uuid,p_state jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 player uuid:=auth.uid();
 current_save public.game_saves%rowtype;
begin
 if player is null then raise exception 'sign_in_required' using errcode='42501'; end if;
 if p_slot is null or p_slot not in (1,2) or p_expected_revision is null or p_expected_revision<0 or p_write_id is null
  or p_state is null or jsonb_typeof(p_state)<>'object'
  or (p_state->>'version') is distinct from '2'
  or not (p_state ? 'content') or not (p_state ? 'story55')
  or p_state->>'day' is null or (p_state->>'day')::integer not between 1 and 55
  or p_state->>'clock' is null or (p_state->>'clock') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  or octet_length(p_state::text)>12000000 then
  raise exception 'invalid_save' using errcode='22023';
 end if;
 select * into current_save from public.game_saves
  where user_id=player and slot=p_slot for update;
 if not found then
  if p_expected_revision<>0 then return jsonb_build_object('status','conflict'); end if;
  insert into public.game_saves (user_id,slot,game_state,story_day,game_clock,view_phase)
   values (player,p_slot,p_state||jsonb_build_object('_cloudWriteId',p_write_id),(p_state->>'day')::integer,p_state->>'clock',
    case when p_state->'story55'->>'secondView'='true' then 'xitai' else 'ximeng' end)
   on conflict (user_id,slot) do nothing returning * into current_save;
  if found then
   return jsonb_build_object('status','saved','id',current_save.id,'revision',current_save.revision,'updated_at',current_save.updated_at);
  end if;
  return jsonb_build_object('status','conflict');
 end if;
 if current_save.game_state->>'_cloudWriteId'=p_write_id::text then
  return jsonb_build_object('status','saved','id',current_save.id,'revision',current_save.revision,'updated_at',current_save.updated_at);
 end if;
 if current_save.revision<>p_expected_revision then
  return jsonb_build_object('status','conflict','revision',current_save.revision);
 end if;
 insert into public.game_save_backups (save_id,user_id,backup_slot,revision,game_state)
  values (current_save.id,player,1+(current_save.revision%3),current_save.revision,current_save.game_state)
  on conflict (save_id,backup_slot) do update set revision=excluded.revision,game_state=excluded.game_state,saved_at=now();
 update public.game_saves set game_state=p_state||jsonb_build_object('_cloudWriteId',p_write_id),story_day=(p_state->>'day')::integer,
  game_clock=p_state->>'clock',revision=current_save.revision+1,updated_at=now(),
  view_phase=case when p_state->'story55'->>'secondView'='true' then 'xitai' else 'ximeng' end
  where id=current_save.id and user_id=player returning * into current_save;
 return jsonb_build_object('status','saved','id',current_save.id,'revision',current_save.revision,'updated_at',current_save.updated_at);
end;
$$;
revoke all on function public.sync_phone_save(integer,integer,uuid,jsonb) from public,anon;
grant execute on function public.sync_phone_save(integer,integer,uuid,jsonb) to authenticated;

insert into storage.buckets (id,name,public,file_size_limit)
 values ('phone-saves','phone-saves',false,4000000) on conflict (id) do nothing;
create policy phone_audio_owner_read on storage.objects for select to authenticated
 using (bucket_id='phone-saves' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy phone_audio_owner_insert on storage.objects for insert to authenticated
 with check (bucket_id='phone-saves' and (storage.foldername(name))[1]=(select auth.uid())::text);
notify pgrst, 'reload schema';
