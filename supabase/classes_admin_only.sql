-- Presença & Aula: somente administradores podem criar, editar ou excluir turmas.
-- Execute no SQL Editor do Supabase após school_management.sql.
-- A política de leitura existente (classes_school_read) é mantida.

drop policy if exists classes_school_write on public.classes;
drop policy if exists classes_admin_manage on public.classes;

create policy classes_admin_manage
on public.classes
for all
using (public.current_school_role(school_id) = 'administrador')
with check (public.current_school_role(school_id) = 'administrador');
