-- Execute no SQL Editor do Supabase antes de usar upload/download de anexos.
-- Bucket privado: os arquivos não ficam publicamente acessíveis.

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS attachment_path text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lesson-attachments', 'lesson-attachments', false, 20971520, NULL)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "lesson attachments upload by lesson owner" ON storage.objects;
CREATE POLICY "lesson attachments upload by lesson owner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lesson-attachments'
  AND EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id::text = split_part(name, '/', 1)
      AND l.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "lesson attachments read with lesson access" ON storage.objects;
CREATE POLICY "lesson attachments read with lesson access"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lesson-attachments'
  AND EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.attachment_path = name
  )
);

DROP POLICY IF EXISTS "lesson attachments delete by lesson owner" ON storage.objects;
CREATE POLICY "lesson attachments delete by lesson owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'lesson-attachments'
  AND EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id::text = split_part(name, '/', 1)
      AND l.user_id = auth.uid()
  )
);
