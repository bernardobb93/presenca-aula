-- Calendário escolar: avaliações, datas importantes e eventos.
-- Execute este arquivo no SQL Editor do Supabase após school_management.sql.
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_date date not null,
  event_type text not null default 'evento'
    check (event_type in ('avaliacao','data_importante','evento')),
  description text not null default '',
  class_id uuid references public.classes(id) on delete set null,
  subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_events_school_date_idx
  on public.calendar_events(school_id, event_date);

alter table public.calendar_events enable row level security;

drop policy if exists "School members can view calendar events" on public.calendar_events;
create policy "School members can view calendar events"
on public.calendar_events for select to authenticated
using (exists (
  select 1 from public.school_members m
  where m.school_id = calendar_events.school_id and m.user_id = auth.uid()
));

drop policy if exists "School members can create calendar events" on public.calendar_events;
create policy "School members can create calendar events"
on public.calendar_events for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.school_members m
    where m.school_id = calendar_events.school_id and m.user_id = auth.uid()
  )
);

drop policy if exists "School members can update calendar events" on public.calendar_events;
create policy "School members can update calendar events"
on public.calendar_events for update to authenticated
using (exists (
  select 1 from public.school_members m
  where m.school_id = calendar_events.school_id and m.user_id = auth.uid()
))
with check (exists (
  select 1 from public.school_members m
  where m.school_id = calendar_events.school_id and m.user_id = auth.uid()
));

drop policy if exists "School members can delete calendar events" on public.calendar_events;
create policy "School members can delete calendar events"
on public.calendar_events for delete to authenticated
using (exists (
  select 1 from public.school_members m
  where m.school_id = calendar_events.school_id and m.user_id = auth.uid()
));
