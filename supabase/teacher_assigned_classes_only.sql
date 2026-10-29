-- Presença & Aula: professores só podem acessar turmas atribuídas a eles.
-- Execute no SQL Editor APÓS school_management.sql, multiple_subjects_attendance.sql, class_subject_teachers.sql e classes_admin_only.sql.
-- Administradores, coordenadores e consulta mantêm as permissões definidas pelo papel.

-- IMPORTANTE: políticas permissivas do PostgreSQL são combinadas com OR.
-- Remova políticas antigas que permitiam ao dono original da turma continuar vendo/editando.
drop policy if exists classes_owner on public.classes;
drop policy if exists classes_school_write on public.classes;
drop policy if exists classes_admin_manage on public.classes;
drop policy if exists classes_school_read on public.classes;

-- Todos os perfis administrativos podem ler turmas; professores podem ler turmas em que tenham ao menos uma disciplina atribuída em class_subject_teachers.
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

-- Criar/editar/excluir turma: apenas administrador.
create policy classes_admin_manage
on public.classes for all
using (public.current_school_role(school_id) = 'administrador')
with check (public.current_school_role(school_id) = 'administrador');

-- Alunos: professor acessa somente alunos de turmas atribuídas.
drop policy if exists students_school_read on public.students;
create policy students_school_read
on public.students for select
using (
  public.current_school_role(school_id) in ('administrador','coordenador','consulta')
  or (
    public.current_school_role(school_id) = 'professor'
    and exists (
      select 1 from public.class_teachers ct
      where ct.class_id = students.class_id
        and ct.school_id = students.school_id
        and ct.user_id = auth.uid()
    )
  )
);
drop policy if exists students_school_write on public.students;
create policy students_school_write
on public.students for all
using (
  public.current_school_role(school_id) in ('administrador','coordenador')
  or (
    public.current_school_role(school_id) = 'professor'
    and exists (select 1
      from public.class_subjects cs
      join public.class_subject_teachers cst
        on cst.class_subject_id = cs.id
       and cst.school_id = cs.school_id
      where cs.class_id = students.class_id
        and cs.school_id = students.school_id
        and cst.user_id = auth.uid())
  )
)
with check (
  public.current_school_role(school_id) in ('administrador','coordenador')
  or (
    public.current_school_role(school_id) = 'professor'
    and exists (select 1
      from public.class_subjects cs
      join public.class_subject_teachers cst
        on cst.class_subject_id = cs.id
       and cst.school_id = cs.school_id
      where cs.class_id = students.class_id
        and cs.school_id = students.school_id
        and cst.user_id = auth.uid())
  )
);

-- Planos de aula: leitura e escrita limitadas às turmas atribuídas ao professor.
drop policy if exists lessons_school_read on public.lessons;
create policy lessons_school_read
on public.lessons for select
using (
  public.current_school_role(school_id) in ('administrador','coordenador','consulta')
  or (
    public.current_school_role(school_id) = 'professor'
    and exists (select 1
      from public.class_subjects cs
      join public.class_subject_teachers cst
        on cst.class_subject_id = cs.id
       and cst.school_id = cs.school_id
      where cs.class_id = lessons.class_id
        and cs.school_id = lessons.school_id
        and cst.user_id = auth.uid())
  )
);
drop policy if exists lessons_school_write on public.lessons;
create policy lessons_school_write
on public.lessons for all
using (
  public.current_school_role(school_id) in ('administrador','coordenador')
  or (
    public.current_school_role(school_id) = 'professor'
    and exists (select 1
      from public.class_subjects cs
      join public.class_subject_teachers cst
        on cst.class_subject_id = cs.id
       and cst.school_id = cs.school_id
      where cs.class_id = lessons.class_id
        and cs.school_id = lessons.school_id
        and cst.user_id = auth.uid())
  )
)
with check (
  public.current_school_role(school_id) in ('administrador','coordenador')
  or (
    public.current_school_role(school_id) = 'professor'
    and exists (select 1
      from public.class_subjects cs
      join public.class_subject_teachers cst
        on cst.class_subject_id = cs.id
       and cst.school_id = cs.school_id
      where cs.class_id = lessons.class_id
        and cs.school_id = lessons.school_id
        and cst.user_id = auth.uid())
  )
);

-- Frequência: professor só pode consultar/registrar presença em aulas de turmas atribuídas.
drop policy if exists attendance_school_read on public.attendance;
create policy attendance_school_read
on public.attendance for select
using (
  public.current_school_role(school_id) in ('administrador','coordenador','consulta')
  or (
    public.current_school_role(school_id) = 'professor'
    and exists (
      select 1 from public.lessons l
      join public.class_subjects cs on cs.class_id = l.class_id and cs.school_id = l.school_id
      join public.class_subject_teachers cst on cst.class_subject_id = cs.id and cst.school_id = cs.school_id
      where l.id = attendance.lesson_id and l.school_id = attendance.school_id and cst.user_id = auth.uid()
    )
  )
);
drop policy if exists attendance_school_write on public.attendance;
create policy attendance_school_write
on public.attendance for all
using (
  public.current_school_role(school_id) in ('administrador','coordenador')
  or (
    public.current_school_role(school_id) = 'professor'
    and exists (
      select 1 from public.lessons l
      join public.class_subjects cs on cs.class_id = l.class_id and cs.school_id = l.school_id
      join public.class_subject_teachers cst on cst.class_subject_id = cs.id and cst.school_id = cs.school_id
      where l.id = attendance.lesson_id and l.school_id = attendance.school_id and cst.user_id = auth.uid()
    )
  )
)
with check (
  public.current_school_role(school_id) in ('administrador','coordenador')
  or (
    public.current_school_role(school_id) = 'professor'
    and exists (
      select 1 from public.lessons l
      join public.class_subjects cs on cs.class_id = l.class_id and cs.school_id = l.school_id
      join public.class_subject_teachers cst on cst.class_subject_id = cs.id and cst.school_id = cs.school_id
      where l.id = attendance.lesson_id and l.school_id = attendance.school_id and cst.user_id = auth.uid()
    )
  )
);
