-- Permite que uma conta participe de várias escolas.
-- Execute no SQL Editor do Supabase. Não apaga vínculos existentes.
create or replace function public.create_school(school_name text) returns public.schools
language plpgsql security definer set search_path=public
as $$
declare created public.schools;
begin
  if auth.uid() is null then raise exception 'Faça login para criar uma escola.'; end if;
  if length(trim(school_name)) < 2 then raise exception 'Informe o nome da escola.'; end if;
  insert into public.schools(name,created_by) values(trim(school_name),auth.uid()) returning * into created;
  insert into public.school_members(school_id,user_id,role) values(created.id,auth.uid(),'administrador') on conflict(school_id,user_id) do nothing;
  return created;
end $$;

create or replace function public.join_school(code text) returns public.schools
language plpgsql security definer set search_path=public
as $$
declare target public.schools;
begin
  if auth.uid() is null then raise exception 'Faça login para entrar em uma escola.'; end if;
  select * into target from public.schools where invite_code=upper(trim(code));
  if target.id is null then raise exception 'Código de convite inválido.'; end if;
  insert into public.school_members(school_id,user_id,role) values(target.id,auth.uid(),'professor') on conflict(school_id,user_id) do nothing;
  return target;
end $$;
