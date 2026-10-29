-- Corrige RLS de avaliações para usar as atribuições atuais por disciplina.
-- Execute no Supabase SQL Editor. Professores podem avaliar somente alunos de turmas
-- onde estejam atribuídos a pelo menos uma disciplina. Administradores/coordenadores mantêm acesso.
drop policy if exists student_evaluations_read on public.student_evaluations;
create policy student_evaluations_read on public.student_evaluations for select to authenticated using (
 public.is_school_member(school_id)
 and exists(select 1 from public.classes c where c.id=student_evaluations.class_id and c.school_id=student_evaluations.school_id)
 and exists(select 1 from public.students st where st.id=student_evaluations.student_id and st.class_id=student_evaluations.class_id and st.school_id=student_evaluations.school_id)
 and (
   public.current_school_role(school_id) in ('administrador','coordenador','consulta')
   or (public.current_school_role(school_id)='professor' and exists(
     select 1 from public.class_subjects cs
     join public.class_subject_teachers cst on cst.class_subject_id=cs.id and cst.school_id=cs.school_id
     where cs.school_id=student_evaluations.school_id and cs.class_id=student_evaluations.class_id and cst.user_id=auth.uid()
   ))
 )
);
drop policy if exists student_evaluations_insert on public.student_evaluations;
create policy student_evaluations_insert on public.student_evaluations for insert to authenticated with check (
 user_id=auth.uid()
 and public.is_school_member(school_id)
 and exists(select 1 from public.classes c where c.id=student_evaluations.class_id and c.school_id=student_evaluations.school_id)
 and exists(select 1 from public.students st where st.id=student_evaluations.student_id and st.class_id=student_evaluations.class_id and st.school_id=student_evaluations.school_id)
 and (
   public.current_school_role(school_id) in ('administrador','coordenador')
   or (public.current_school_role(school_id)='professor' and exists(
     select 1 from public.class_subjects cs
     join public.class_subject_teachers cst on cst.class_subject_id=cs.id and cst.school_id=cs.school_id
     where cs.school_id=student_evaluations.school_id and cs.class_id=student_evaluations.class_id and cst.user_id=auth.uid()
   ))
 )
);
drop policy if exists student_evaluations_update on public.student_evaluations;
create policy student_evaluations_update on public.student_evaluations for update to authenticated using (
 public.is_school_member(school_id)
 and exists(select 1 from public.classes c where c.id=student_evaluations.class_id and c.school_id=student_evaluations.school_id)
 and exists(select 1 from public.students st where st.id=student_evaluations.student_id and st.class_id=student_evaluations.class_id and st.school_id=student_evaluations.school_id)
 and (public.current_school_role(school_id) in ('administrador','coordenador') or (public.current_school_role(school_id)='professor' and exists(
   select 1 from public.class_subjects cs join public.class_subject_teachers cst on cst.class_subject_id=cs.id and cst.school_id=cs.school_id
   where cs.school_id=student_evaluations.school_id and cs.class_id=student_evaluations.class_id and cst.user_id=auth.uid()
 )))
) with check (
 public.is_school_member(school_id)
 and exists(select 1 from public.classes c where c.id=student_evaluations.class_id and c.school_id=student_evaluations.school_id)
 and exists(select 1 from public.students st where st.id=student_evaluations.student_id and st.class_id=student_evaluations.class_id and st.school_id=student_evaluations.school_id)
 and (public.current_school_role(school_id) in ('administrador','coordenador') or (public.current_school_role(school_id)='professor' and exists(
   select 1 from public.class_subjects cs join public.class_subject_teachers cst on cst.class_subject_id=cs.id and cst.school_id=cs.school_id
   where cs.school_id=student_evaluations.school_id and cs.class_id=student_evaluations.class_id and cst.user_id=auth.uid()
 )))
);
drop policy if exists student_evaluations_delete on public.student_evaluations;
create policy student_evaluations_delete on public.student_evaluations for delete to authenticated using (
 public.is_school_member(school_id)
 and exists(select 1 from public.classes c where c.id=student_evaluations.class_id and c.school_id=student_evaluations.school_id)
 and exists(select 1 from public.students st where st.id=student_evaluations.student_id and st.class_id=student_evaluations.class_id and st.school_id=student_evaluations.school_id)
 and (public.current_school_role(school_id) in ('administrador','coordenador') or (public.current_school_role(school_id)='professor' and exists(
   select 1 from public.class_subjects cs join public.class_subject_teachers cst on cst.class_subject_id=cs.id and cst.school_id=cs.school_id
   where cs.school_id=student_evaluations.school_id and cs.class_id=student_evaluations.class_id and cst.user_id=auth.uid()
 )))
);
