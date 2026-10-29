-- Gestão Escolar: disciplinas independentes por turma.
-- Execute no SQL Editor do Supabase antes de publicar a versão do app.
-- A lista existente em classes.subject é preservada e dividida por vírgula/ponto e vírgula.

create table if not exists public.class_subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

create index if not exists class_subjects_school_idx on public.class_subjects(school_id);
create index if not exists class_subjects_class_idx on public.class_subjects(class_id);

-- Backfill idempotente: transforma cada disciplina antiga em uma linha.
insert into public.class_subjects (school_id, class_id, name)
select c.school_id, c.id, trim(part.name)
from public.classes c
cross join lateral regexp_split_to_table(coalesce(c.subject, ''), '[,;\n]+') as part(name)
where c.school_id is not null and trim(part.name) <> ''
on conflict (class_id, name) do nothing;

alter table public.class_subjects enable row level security;
drop policy if exists class_subjects_school_read on public.class_subjects;
drop policy if exists class_subjects_admin_write on public.class_subjects;
create policy class_subjects_school_read on public.class_subjects
for select using (
  exists (select 1 from public.school_members sm
          where sm.school_id = class_subjects.school_id and sm.user_id = auth.uid())
);
create policy class_subjects_admin_write on public.class_subjects
for all using (public.current_school_role(school_id) in ('administrador','coordenador'))
with check (public.current_school_role(school_id) in ('administrador','coordenador'));

-- As chamadas continuam armazenadas por lesson_id. O app agora cria uma aula
-- por turma + data + disciplina (title = 'Aula de <disciplina>'), garantindo
-- registros de presença independentes para o mesmo aluno e dia.
