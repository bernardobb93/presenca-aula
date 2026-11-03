-- Correção de acesso às turmas por atribuição de disciplina.
-- Execute no SQL Editor do Supabase como administrador do projeto.
-- Seguro para reexecutar: não remove vínculos existentes.

-- 1) Garante que as disciplinas antigas das turmas estejam cadastradas.
insert into public.class_subjects (school_id, class_id, name)
select c.school_id, c.id, trim(part.name)
from public.classes c
cross join lateral regexp_split_to_table(coalesce(c.subject, ''), '[,;\n]+') as part(name)
where c.school_id is not null and trim(part.name) <> ''
on conflict (class_id, name) do nothing;

-- 2) Migra atribuições antigas por turma para cada disciplina da mesma turma.
-- Isso evita que professores já atribuídos pelo modelo antigo percam acesso.
insert into public.class_subject_teachers (school_id, class_subject_id, user_id)
select cs.school_id, cs.id, ct.user_id
from public.class_teachers ct
join public.class_subjects cs
  on cs.class_id = ct.class_id
 and cs.school_id = ct.school_id
on conflict (class_subject_id, user_id) do nothing;

-- 3) Permite ao professor ler somente turmas com pelo menos uma disciplina atribuída.
drop policy if exists classes_owner on public.classes;
drop policy if exists classes_school_read on public.classes;
drop policy if exists classes_admin_manage on public.classes;
drop policy if exists classes_school_write on public.classes;
create policy classes_school_read
on public.classes for select
using (
  public.current_school_role(school_id) in ('administrador','coordenador','consulta')
  or (
    public.current_school_role(school_id) = 'professor'
    and exists (
      select 1
      from public.class_subjects cs
      join public.class_subject_teachers cst
        on cst.class_subject_id = cs.id
       and cst.school_id = cs.school_id
      where cs.class_id = classes.id
        and cs.school_id = classes.school_id
        and cst.user_id = auth.uid()
    )
  )
);
create policy classes_admin_manage
on public.classes for all
using (public.current_school_role(school_id) = 'administrador')
with check (public.current_school_role(school_id) = 'administrador');

-- 4) A mesma regra para alunos: a permissão antiga class_teachers não é mais suficiente.
drop policy if exists students_school_read on public.students;
create policy students_school_read
on public.students for select
using (
  public.current_school_role(school_id) in ('administrador','coordenador','consulta')
  or (
    public.current_school_role(school_id) = 'professor'
    and exists (
      select 1
      from public.class_subjects cs
      join public.class_subject_teachers cst
        on cst.class_subject_id = cs.id
       and cst.school_id = cs.school_id
      where cs.class_id = students.class_id
        and cs.school_id = students.school_id
        and cst.user_id = auth.uid()
    )
  )
);

-- 5) Confirmação: resultado mostra quantas disciplinas estão atribuídas por professor/turma.
select s.name as escola, c.name as turma, cs.name as disciplina,
       coalesce(p.full_name, au.email, cst.user_id::text) as professor
from public.class_subject_teachers cst
join public.class_subjects cs on cs.id = cst.class_subject_id and cs.school_id = cst.school_id
join public.classes c on c.id = cs.class_id and c.school_id = cs.school_id
join public.schools s on s.id = c.school_id
left join public.profiles p on p.id = cst.user_id
left join auth.users au on au.id = cst.user_id
order by s.name, c.name, cs.name, professor;
