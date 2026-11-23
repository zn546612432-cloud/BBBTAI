-- A backup may only remain attached to a save owned by the same player.
alter policy backup_owner_update on public.game_save_backups
 with check ((select auth.uid())=user_id and exists (
  select 1 from public.game_saves s where s.id=save_id and s.user_id=(select auth.uid())));
