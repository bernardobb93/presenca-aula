-- Limita aulas e chamadas à disciplina efetivamente atribuída ao professor.
-- Execute no SQL Editor após class_subject_teachers.sql e teacher_assigned_classes_only.sql.
-- As políticas de leitura/escrita são substituídas para evitar permissões permissivas antigas.
drop policy if exists lessons_school_write on public.lessons;
create policy lessons_school_write on public.lessons
for all
using (
  public.current_school_role(school_id) in ('administrador','coordenador')
  or (
    public.current_school_role(school_id) = 'professor'
    and exists (
      select 1 from public.class_subjects cs
      join public.class_subject_teachers cst
        on cst.class_subject_id = cs.id and cst.school_id = cs.school_id
      where cs.class_id = lessons.class_id
        and cs.school_id = lessons.school_id
        and cst.user_id = auth.uid()
        and lessons.title = 'Aula de ' || cs.name
    )
  )
)
with check (
  public.current_school_role(school_id) in ('administrador','coordenador')
  or (
    public.current_school_role(school_id) = 'professor'
    and exists (
      select 1 from public.class_subjects cs
      join public.class_subject_teachers cst
        on cst.class_subject_id = cs.id and cst.school_id = cs.school_id
      where cs.class_id = lessons.class_id
        and cs.school_id = lessons.school_id
        and cst.user_id = auth.uid()
        and lessons.title = 'Aula de ' || cs.name
    )
  )
);

drop policy if exists attendance_school_read on public.attendance;
create policy attendance_school_read on public.attendance
for select using (
  public.current_school_role(school_id) in ('administrador','coordenador','consulta')
  or (
    public.current_school_role(school_id) = 'professor'
    and exists (
      select 1 from public.lessons l
      join public.class_subjects cs on cs.class_id=l.class_id and cs.school_id=l.school_id
      join public.class_subject_teachers cst on cst.class_subject_id=cs.id and cst.school_id=cs.school_id
      where l.id=attendance.lesson_id and l.school_id=attendance.school_id
        and cst.user_id=auth.uid() and l.title='Aula de ' || cs.name
    )
  )
);

drop policy if exists attendance_school_write on public.attendance;
create policy attendance_school_write on public.attendance
for all
using (
  public.current_school_role(school_id) in ('administrador','coordenador')
  or (
    public.current_school_role(school_id) = 'professor'
    and exists (
      select 1 from public.lessons l
      join public.class_subjects cs on cs.class_id=l.class_id and cs.school_id=l.school_id
      join public.class_subject_teachers cst on cst.class_subject_id=cs.id and cst.school_id=cs.school_id
      where l.id=attendance.lesson_id and l.school_id=attendance.school_id
        and cst.user_id=auth.uid() and l.title='Aula de ' || cs.name
    )
  )
)
with check (
  public.current_school_role(school_id) in ('administrador','coordenador')
  or (
    public.current_school_role(school_id) = 'professor'
    and exists (
      select 1 from public.lessons l
      join public.class_subjects cs on cs.class_id=l.class_id and cs.school_id=l.school_id
      join public.class_subject_teachers cst on cst.class_subject_id=cs.id and cst.school_id=cs.school_id
      where l.id=attendance.lesson_id and l.school_id=attendance.school_id
        and cst.user_id=auth.uid() and l.title='Aula de ' || cs.name
    )
  )
);
