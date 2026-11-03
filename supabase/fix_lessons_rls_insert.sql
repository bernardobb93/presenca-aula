-- Corrige o erro 42501 ao salvar Planos de Aula (tabela public.lessons).
-- O bloqueio anterior exigia que lessons.title fosse exatamente 'Aula de ' || nome da disciplina.
-- A tela de Planos de Aula permite título livre; por isso essa condição impedia INSERTs legítimos.
-- Esta política autoriza somente membros da escola: administradores/coordenadores da escola
-- e professores com ao menos uma disciplina atribuída na turma selecionada.
-- Não altera nem apaga registros existentes.

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Remove a política restritiva que comparava o título com o nome da disciplina.
DROP POLICY IF EXISTS lessons_school_write ON public.lessons;

-- Remove possíveis políticas antigas com o mesmo propósito/nome, para evitar ambiguidade.
DROP POLICY IF EXISTS lessons_insert_assigned_class ON public.lessons;
DROP POLICY IF EXISTS lessons_update_assigned_class ON public.lessons;
DROP POLICY IF EXISTS lessons_delete_assigned_class ON public.lessons;

CREATE POLICY lessons_insert_assigned_class
ON public.lessons
FOR INSERT TO authenticated
WITH CHECK (
  school_id IS NOT NULL
  AND (
    public.current_school_role(school_id) IN ('administrador', 'coordenador')
    OR (
      public.current_school_role(school_id) = 'professor'
      AND EXISTS (
        SELECT 1
        FROM public.class_subjects cs
        JOIN public.class_subject_teachers cst
          ON cst.class_subject_id = cs.id
         AND cst.school_id = cs.school_id
        WHERE cs.class_id = lessons.class_id
          AND cs.school_id = lessons.school_id
          AND cst.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY lessons_update_assigned_class
ON public.lessons
FOR UPDATE TO authenticated
USING (
  public.current_school_role(school_id) IN ('administrador', 'coordenador')
  OR (
    public.current_school_role(school_id) = 'professor'
    AND EXISTS (
      SELECT 1
      FROM public.class_subjects cs
      JOIN public.class_subject_teachers cst
        ON cst.class_subject_id = cs.id
       AND cst.school_id = cs.school_id
      WHERE cs.class_id = lessons.class_id
        AND cs.school_id = lessons.school_id
        AND cst.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  school_id IS NOT NULL
  AND (
    public.current_school_role(school_id) IN ('administrador', 'coordenador')
    OR (
      public.current_school_role(school_id) = 'professor'
      AND EXISTS (
        SELECT 1
        FROM public.class_subjects cs
        JOIN public.class_subject_teachers cst
          ON cst.class_subject_id = cs.id
         AND cst.school_id = cs.school_id
        WHERE cs.class_id = lessons.class_id
          AND cs.school_id = lessons.school_id
          AND cst.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY lessons_delete_assigned_class
ON public.lessons
FOR DELETE TO authenticated
USING (
  public.current_school_role(school_id) IN ('administrador', 'coordenador')
  OR (
    public.current_school_role(school_id) = 'professor'
    AND EXISTS (
      SELECT 1
      FROM public.class_subjects cs
      JOIN public.class_subject_teachers cst
        ON cst.class_subject_id = cs.id
       AND cst.school_id = cs.school_id
      WHERE cs.class_id = lessons.class_id
        AND cs.school_id = lessons.school_id
        AND cst.user_id = auth.uid()
    )
  )
);

NOTIFY pgrst, 'reload schema';

-- Diagnóstico: mostra as permissões ativas para a tabela lessons.
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'lessons'
ORDER BY policyname;
