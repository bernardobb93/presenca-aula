-- Gestão Escolar: múltiplas aulas/chamadas por disciplina e por dia.
-- Execute uma única vez no SQL Editor do Supabase antes de publicar o aplicativo.
-- Não apaga aulas, planos, anexos ou chamadas existentes.

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS class_subject_id uuid NULL
  REFERENCES public.class_subjects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS lessons_school_class_subject_date_idx
  ON public.lessons (school_id, class_id, class_subject_id, date);

-- Vincula aulas antigas cujo título segue o padrão "Aula de <disciplina>".
-- Registros sem correspondência permanecem preservados com class_subject_id NULL.
UPDATE public.lessons l
SET class_subject_id = cs.id
FROM public.class_subjects cs
WHERE l.class_subject_id IS NULL
  AND cs.school_id = l.school_id
  AND cs.class_id = l.class_id
  AND l.title = 'Aula de ' || cs.name;

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Remove políticas anteriores que poderiam permitir ou bloquear acessos de forma conflitante.
DROP POLICY IF EXISTS lessons_school_read ON public.lessons;
DROP POLICY IF EXISTS lessons_school_write ON public.lessons;
DROP POLICY IF EXISTS lessons_insert_assigned_class ON public.lessons;
DROP POLICY IF EXISTS lessons_update_assigned_class ON public.lessons;
DROP POLICY IF EXISTS lessons_delete_assigned_class ON public.lessons;

CREATE POLICY lessons_school_read ON public.lessons
FOR SELECT TO authenticated
USING (
  public.current_school_role(school_id) IN ('administrador','coordenador','consulta')
  OR (
    public.current_school_role(school_id) = 'professor'
    AND EXISTS (
      SELECT 1
      FROM public.class_subjects cs
      JOIN public.class_subject_teachers cst
        ON cst.class_subject_id = cs.id AND cst.school_id = cs.school_id
      WHERE cs.school_id = lessons.school_id
        AND cs.class_id = lessons.class_id
        AND cst.user_id = auth.uid()
        AND (lessons.class_subject_id IS NULL OR lessons.class_subject_id = cs.id)
    )
  )
);

CREATE POLICY lessons_insert_assigned_class ON public.lessons
FOR INSERT TO authenticated
WITH CHECK (
  school_id IS NOT NULL
  AND (
    public.current_school_role(school_id) IN ('administrador','coordenador')
    OR (
      public.current_school_role(school_id) = 'professor'
      AND class_subject_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.class_subjects cs
        JOIN public.class_subject_teachers cst
          ON cst.class_subject_id = cs.id AND cst.school_id = cs.school_id
        WHERE cs.id = lessons.class_subject_id
          AND cs.class_id = lessons.class_id
          AND cs.school_id = lessons.school_id
          AND cst.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY lessons_update_assigned_class ON public.lessons
FOR UPDATE TO authenticated
USING (
  public.current_school_role(school_id) IN ('administrador','coordenador')
  OR (
    public.current_school_role(school_id) = 'professor'
    AND EXISTS (
      SELECT 1 FROM public.class_subjects cs
      JOIN public.class_subject_teachers cst
        ON cst.class_subject_id = cs.id AND cst.school_id = cs.school_id
      WHERE cs.school_id = lessons.school_id
        AND cs.class_id = lessons.class_id
        AND cst.user_id = auth.uid()
        AND (lessons.class_subject_id IS NULL OR lessons.class_subject_id = cs.id)
    )
  )
)
WITH CHECK (
  school_id IS NOT NULL
  AND (
    public.current_school_role(school_id) IN ('administrador','coordenador')
    OR (
      public.current_school_role(school_id) = 'professor'
      AND class_subject_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.class_subjects cs
        JOIN public.class_subject_teachers cst
          ON cst.class_subject_id = cs.id AND cst.school_id = cs.school_id
        WHERE cs.id = lessons.class_subject_id
          AND cs.class_id = lessons.class_id
          AND cs.school_id = lessons.school_id
          AND cst.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY lessons_delete_assigned_class ON public.lessons
FOR DELETE TO authenticated
USING (
  public.current_school_role(school_id) IN ('administrador','coordenador')
  OR (
    public.current_school_role(school_id) = 'professor'
    AND EXISTS (
      SELECT 1 FROM public.class_subjects cs
      JOIN public.class_subject_teachers cst
        ON cst.class_subject_id = cs.id AND cst.school_id = cs.school_id
      WHERE cs.school_id = lessons.school_id
        AND cs.class_id = lessons.class_id
        AND cst.user_id = auth.uid()
        AND (lessons.class_subject_id IS NULL OR lessons.class_subject_id = cs.id)
    )
  )
);

-- Chamadas só podem ser consultadas/alteradas pelo professor da disciplina da aula.
DROP POLICY IF EXISTS attendance_school_read ON public.attendance;
DROP POLICY IF EXISTS attendance_school_write ON public.attendance;
DROP POLICY IF EXISTS attendance_assigned_subject_read ON public.attendance;
DROP POLICY IF EXISTS attendance_assigned_subject_write ON public.attendance;

CREATE POLICY attendance_assigned_subject_read ON public.attendance
FOR SELECT TO authenticated
USING (
  public.current_school_role(school_id) IN ('administrador','coordenador','consulta')
  OR (
    public.current_school_role(school_id) = 'professor'
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.class_subject_teachers cst
        ON cst.class_subject_id = l.class_subject_id AND cst.school_id = l.school_id
      WHERE l.id = attendance.lesson_id
        AND l.school_id = attendance.school_id
        AND cst.user_id = auth.uid()
    )
  )
);

CREATE POLICY attendance_assigned_subject_write ON public.attendance
FOR ALL TO authenticated
USING (
  public.current_school_role(school_id) IN ('administrador','coordenador')
  OR (
    public.current_school_role(school_id) = 'professor'
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.class_subject_teachers cst
        ON cst.class_subject_id = l.class_subject_id AND cst.school_id = l.school_id
      WHERE l.id = attendance.lesson_id
        AND l.school_id = attendance.school_id
        AND cst.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  school_id IS NOT NULL
  AND (
    public.current_school_role(school_id) IN ('administrador','coordenador')
    OR (
      public.current_school_role(school_id) = 'professor'
      AND EXISTS (
        SELECT 1 FROM public.lessons l
        JOIN public.class_subject_teachers cst
          ON cst.class_subject_id = l.class_subject_id AND cst.school_id = l.school_id
        WHERE l.id = attendance.lesson_id
          AND l.school_id = attendance.school_id
          AND cst.user_id = auth.uid()
      )
    )
  )
);

NOTIFY pgrst, 'reload schema';
