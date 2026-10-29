-- Gestão Escolar: notas e médias por aluno
create table if not exists public.student_evaluations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (length(trim(title)) > 0),
  evaluation_date date not null default current_date,
  score numeric(7,2) not null check (score >= 0),
  max_score numeric(7,2) not null check (max_score > 0 and score <= max_score),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists student_evaluations_school_class_date_idx on public.student_evaluations(school_id,class_id,evaluation_date desc);
create index if not exists student_evaluations_student_idx on public.student_evaluations(student_id,evaluation_date desc);
alter table public.student_evaluations enable row level security;
revoke all on public.student_evaluations from anon;
grant select,insert,update,delete on public.student_evaluations to authenticated;
drop policy if exists student_evaluations_read on public.student_evaluations;
create policy student_evaluations_read on public.student_evaluations for select to authenticated using (
 public.is_school_member(school_id) and exists(select 1 from public.classes c where c.id=student_evaluations.class_id and c.school_id=student_evaluations.school_id) and exists(select 1 from public.students st where st.id=student_evaluations.student_id and st.class_id=student_evaluations.class_id and st.school_id=student_evaluations.school_id) and (
  public.current_school_role(school_id) in ('administrador','coordenador','consulta') or
  (public.current_school_role(school_id)='professor' and exists(select 1 from public.class_subjects cs join public.class_subject_teachers cst on cst.class_subject_id=cs.id and cst.school_id=cs.school_id where cs.school_id=student_evaluations.school_id and cs.class_id=student_evaluations.class_id and cst.user_id=auth.uid()))
 )
);
drop policy if exists student_evaluations_insert on public.student_evaluations;
create policy student_evaluations_insert on public.student_evaluations for insert to authenticated with check (
 user_id=auth.uid() and public.is_school_member(school_id) and exists(select 1 from public.classes c where c.id=student_evaluations.class_id and c.school_id=student_evaluations.school_id) and exists(select 1 from public.students st where st.id=student_evaluations.student_id and st.class_id=student_evaluations.class_id and st.school_id=student_evaluations.school_id) and (
  public.current_school_role(school_id) in ('administrador','coordenador') or
  (public.current_school_role(school_id)='professor' and exists(select 1 from public.class_subjects cs join public.class_subject_teachers cst on cst.class_subject_id=cs.id and cst.school_id=cs.school_id where cs.school_id=student_evaluations.school_id and cs.class_id=student_evaluations.class_id and cst.user_id=auth.uid()))
 )
);
drop policy if exists student_evaluations_update on public.student_evaluations;
create policy student_evaluations_update on public.student_evaluations for update to authenticated using (
 public.is_school_member(school_id) and exists(select 1 from public.classes c where c.id=student_evaluations.class_id and c.school_id=student_evaluations.school_id) and exists(select 1 from public.students st where st.id=student_evaluations.student_id and st.class_id=student_evaluations.class_id and st.school_id=student_evaluations.school_id) and (public.current_school_role(school_id) in ('administrador','coordenador') or (public.current_school_role(school_id)='professor' and exists(select 1 from public.class_subjects cs join public.class_subject_teachers cst on cst.class_subject_id=cs.id and cst.school_id=cs.school_id where cs.school_id=student_evaluations.school_id and cs.class_id=student_evaluations.class_id and cst.user_id=auth.uid())))
) with check (
 public.is_school_member(school_id) and exists(select 1 from public.classes c where c.id=student_evaluations.class_id and c.school_id=student_evaluations.school_id) and exists(select 1 from public.students st where st.id=student_evaluations.student_id and st.class_id=student_evaluations.class_id and st.school_id=student_evaluations.school_id) and (public.current_school_role(school_id) in ('administrador','coordenador') or (public.current_school_role(school_id)='professor' and exists(select 1 from public.class_subjects cs join public.class_subject_teachers cst on cst.class_subject_id=cs.id and cst.school_id=cs.school_id where cs.school_id=student_evaluations.school_id and cs.class_id=student_evaluations.class_id and cst.user_id=auth.uid())))
);
drop policy if exists student_evaluations_delete on public.student_evaluations;
create policy student_evaluations_delete on public.student_evaluations for delete to authenticated using (
 public.is_school_member(school_id) and exists(select 1 from public.classes c where c.id=student_evaluations.class_id and c.school_id=student_evaluations.school_id) and exists(select 1 from public.students st where st.id=student_evaluations.student_id and st.class_id=student_evaluations.class_id and st.school_id=student_evaluations.school_id) and (public.current_school_role(school_id) in ('administrador','coordenador') or (public.current_school_role(school_id)='professor' and exists(select 1 from public.class_subjects cs join public.class_subject_teachers cst on cst.class_subject_id=cs.id and cst.school_id=cs.school_id where cs.school_id=student_evaluations.school_id and cs.class_id=student_evaluations.class_id and cst.user_id=auth.uid())))
);
