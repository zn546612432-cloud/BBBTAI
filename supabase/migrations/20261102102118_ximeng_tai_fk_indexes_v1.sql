-- Add FK-side indexes for memory/decision/action retention and message deletion.
create index tai_actions_source_message_idx on public.tai_actions(source_message_id) where source_message_id is not null;
create index tai_decisions_source_message_idx on public.tai_decisions(source_message_id) where source_message_id is not null;
create index tai_memories_origin_message_idx on public.tai_memories(origin_message_id) where origin_message_id is not null;
create index tai_relationship_source_message_idx on public.tai_relationship_events(source_message_id) where source_message_id is not null;
