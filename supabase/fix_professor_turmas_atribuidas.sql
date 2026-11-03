-- Correção: garantir que professores vejam os alunos das turmas
-- em que possuem ao menos uma disciplina atribuída.
-- Execute no SQL Editor do Supabase após as migrações de disciplinas.

DROP POLICY IF EXISTS students_school_read ON public.students;
CREATE POLICY students_school_read
ON public.students FOR SELECT
USING (
  public.current_school_role(school_id) IN ('administrador','coordenador','consulta')
  OR (
    public.current_school_role(school_id) = 'professor'
    AND EXISTS (
      SELECT 1
      FROM public.class_subjects cs
      JOIN public.class_subject_teachers cst
        ON cst.class_subject_id = cs.id
       AND cst.school_id = cs.school_id
      WHERE cs.class_id = students.class_id
        AND cs.school_id = students.school_id
        AND cst.user_id = auth.uid()
    )
  )
);
