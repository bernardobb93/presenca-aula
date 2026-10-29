-- Corrige as políticas de exclusão/alteração para o usuário autenticado.
-- Execute este arquivo uma vez no Supabase SQL Editor.

alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.lessons enable row level security;
alter table public.attendance enable row level security;

drop policy if exists classes_owner on public.classes;
create policy classes_owner on public.classes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists students_owner on public.students;
create policy students_owner on public.students
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists lessons_owner on public.lessons;
create policy lessons_owner on public.lessons
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists attendance_owner on public.attendance;
create policy attendance_owner on public.attendance
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

notify pgrst, 'reload schema';
