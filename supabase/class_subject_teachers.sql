-- Atribuição de professores por disciplina da turma (idempotente).
-- Execute depois de school_management.sql e multiple_subjects_attendance.sql.
create table if not exists public.class_subject_teachers (
  school_id uuid not null references public.schools(id) on delete cascade,
  class_subject_id uuid not null references public.class_subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_subject_id, user_id)
);
create index if not exists class_subject_teachers_school_idx on public.class_subject_teachers(school_id);
create index if not exists class_subject_teachers_user_idx on public.class_subject_teachers(user_id);
alter table public.class_subject_teachers enable row level security;
drop policy if exists class_subject_teachers_read on public.class_subject_teachers;
drop policy if exists class_subject_teachers_admin_manage on public.class_subject_teachers;
create policy class_subject_teachers_read on public.class_subject_teachers for select
using (public.is_school_member(school_id));
create policy class_subject_teachers_admin_manage on public.class_subject_teachers for all
using (public.current_school_role(school_id) in ('administrador','coordenador'))
with check (public.current_school_role(school_id) in ('administrador','coordenador'));
-- Mantém a antiga atribuição por turma para compatibilidade; não apaga dados existentes.
