-- Gestão por escola para Presença & Aula.
-- Execute no SQL Editor do Supabase após o schema.sql existente.
create extension if not exists pgcrypto;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.school_members (
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'professor' check (role in ('administrador','coordenador','professor','consulta')),
  created_at timestamptz not null default now(),
  primary key (school_id, user_id)
);

alter table public.classes add column if not exists school_id uuid references public.schools(id) on delete cascade;
alter table public.students add column if not exists school_id uuid references public.schools(id) on delete cascade;
alter table public.lessons add column if not exists school_id uuid references public.schools(id) on delete cascade;
alter table public.attendance add column if not exists school_id uuid references public.schools(id) on delete cascade;

-- Migra os dados existentes: cada proprietário recebe uma escola própria.
do $$
declare u record; sid uuid; school_name text;
begin
  for u in select distinct user_id from public.classes
    union select distinct user_id from public.students
    union select distinct user_id from public.lessons
    union select distinct user_id from public.attendance
  loop
    select id into sid from public.schools s join public.school_members m on m.school_id=s.id
      where m.user_id=u.user_id and m.role='administrador' limit 1;
    if sid is null then
      school_name := coalesce((select split_part(email, '@', 1) from auth.users where id=u.user_id), 'Minha escola') || ' — Escola';
      insert into public.schools(name, created_by) values (school_name, u.user_id) returning id into sid;
      insert into public.school_members(school_id,user_id,role) values(sid,u.user_id,'administrador') on conflict do nothing;
    end if;
    update public.classes set school_id=sid where user_id=u.user_id and school_id is null;
    update public.students set school_id=sid where user_id=u.user_id and school_id is null;
    update public.lessons set school_id=sid where user_id=u.user_id and school_id is null;
    update public.attendance set school_id=sid where user_id=u.user_id and school_id is null;
  end loop;
end $$;

create index if not exists classes_school_idx on public.classes(school_id);
create index if not exists students_school_idx on public.students(school_id);
create index if not exists lessons_school_idx on public.lessons(school_id);
create index if not exists attendance_school_idx on public.attendance(school_id);
create index if not exists school_members_user_idx on public.school_members(user_id);

create or replace function public.current_school_id() returns uuid
language sql stable security definer set search_path=public
as $$ select school_id from public.school_members where user_id=auth.uid() order by created_at limit 1 $$;

create or replace function public.current_school_role(target_school uuid default null) returns text
language sql stable security definer set search_path=public
as $$ select role from public.school_members where user_id=auth.uid() and (target_school is null or school_id=target_school) order by created_at limit 1 $$;

-- Preenche school_id em novos registros para manter compatibilidade com as telas atuais.
create or replace function public.assign_current_school() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if new.school_id is null then new.school_id := public.current_school_id(); end if;
  if new.school_id is null then raise exception 'Entre em uma escola antes de cadastrar dados.'; end if;
  if not exists(select 1 from public.school_members where user_id=auth.uid() and school_id=new.school_id) then
    raise exception 'Você não pertence a esta escola.';
  end if;
  return new;
end $$;

drop trigger if exists classes_assign_school on public.classes;
create trigger classes_assign_school before insert on public.classes for each row execute function public.assign_current_school();
drop trigger if exists students_assign_school on public.students;
create trigger students_assign_school before insert on public.students for each row execute function public.assign_current_school();
drop trigger if exists lessons_assign_school on public.lessons;
create trigger lessons_assign_school before insert on public.lessons for each row execute function public.assign_current_school();
drop trigger if exists attendance_assign_school on public.attendance;
create trigger attendance_assign_school before insert on public.attendance for each row execute function public.assign_current_school();

create or replace function public.create_school(school_name text) returns public.schools
language plpgsql security definer set search_path=public
as $$
declare created public.schools;
begin
  if auth.uid() is null then raise exception 'Faça login para criar uma escola.'; end if;
  if length(trim(school_name)) < 2 then raise exception 'Informe o nome da escola.'; end if;
  insert into public.schools(name,created_by) values(trim(school_name),auth.uid()) returning * into created;
  insert into public.school_members(school_id,user_id,role) values(created.id,auth.uid(),'administrador');
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

create or replace function public.is_school_member(target_school uuid) returns boolean
language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.school_members where school_id=target_school and user_id=auth.uid()) $$;

alter table public.schools enable row level security;
alter table public.school_members enable row level security;
drop policy if exists schools_member_read on public.schools;
create policy schools_member_read on public.schools for select using (public.is_school_member(id));
drop policy if exists schools_admin_update on public.schools;
create policy schools_admin_update on public.schools for update using (public.current_school_role(id)='administrador') with check (public.current_school_role(id)='administrador');
drop policy if exists members_read_school on public.school_members;
create policy members_read_school on public.school_members for select using (public.is_school_member(school_id));
drop policy if exists members_admin_manage on public.school_members;
create policy members_admin_manage on public.school_members for all using (public.current_school_role(school_id)='administrador') with check (public.current_school_role(school_id)='administrador');

-- Vínculos entre professores e turmas; somente administração pode atribuir turmas.
create table if not exists public.class_teachers (
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key(class_id,user_id)
);
alter table public.class_teachers enable row level security;
drop policy if exists class_teachers_read on public.class_teachers;
create policy class_teachers_read on public.class_teachers for select using (public.is_school_member(school_id));
drop policy if exists class_teachers_admin_manage on public.class_teachers;
create policy class_teachers_admin_manage on public.class_teachers for all using (public.current_school_role(school_id) in ('administrador','coordenador')) with check (public.current_school_role(school_id) in ('administrador','coordenador'));

-- Policies por escola e papel. A validação acontece no banco, não apenas na interface.
drop policy if exists classes_owner on public.classes;
drop policy if exists students_owner on public.students;
drop policy if exists lessons_owner on public.lessons;
drop policy if exists attendance_owner on public.attendance;
drop policy if exists classes_school_read on public.classes;
drop policy if exists classes_school_write on public.classes;
drop policy if exists students_school_read on public.students;
drop policy if exists students_school_write on public.students;
drop policy if exists lessons_school_read on public.lessons;
drop policy if exists lessons_school_write on public.lessons;
drop policy if exists attendance_school_read on public.attendance;
drop policy if exists attendance_school_write on public.attendance;
create policy classes_school_read on public.classes for select using (public.current_school_role(school_id) in ('administrador','coordenador','consulta') or (public.current_school_role(school_id)='professor' and exists(select 1 from public.class_teachers ct where ct.class_id=classes.id and ct.user_id=auth.uid())));
create policy classes_school_write on public.classes for all
 using (public.current_school_role(school_id) in ('administrador','coordenador') or (public.current_school_role(school_id)='professor' and exists(select 1 from public.class_teachers ct where ct.class_id=classes.id and ct.user_id=auth.uid())))
 with check (public.current_school_role(school_id) in ('administrador','coordenador') or (public.current_school_role(school_id)='professor' and exists(select 1 from public.class_teachers ct where ct.class_id=classes.id and ct.user_id=auth.uid())));
create policy students_school_read on public.students for select using (public.current_school_role(school_id) in ('administrador','coordenador','consulta') or (public.current_school_role(school_id)='professor' and exists(select 1 from public.class_teachers ct where ct.class_id=students.class_id and ct.user_id=auth.uid())));
create policy students_school_write on public.students for all
 using (public.current_school_role(school_id) in ('administrador','coordenador') or (public.current_school_role(school_id)='professor' and exists(select 1 from public.class_teachers ct where ct.class_id=students.class_id and ct.user_id=auth.uid())))
 with check (public.current_school_role(school_id) in ('administrador','coordenador') or (public.current_school_role(school_id)='professor' and exists(select 1 from public.class_teachers ct where ct.class_id=students.class_id and ct.user_id=auth.uid())));
create policy lessons_school_read on public.lessons for select using (public.current_school_role(school_id) in ('administrador','coordenador','consulta') or (public.current_school_role(school_id)='professor' and exists(select 1 from public.class_teachers ct where ct.class_id=lessons.class_id and ct.user_id=auth.uid())));
create policy lessons_school_write on public.lessons for all
 using (public.current_school_role(school_id) in ('administrador','coordenador') or (public.current_school_role(school_id)='professor' and exists(select 1 from public.class_teachers ct where ct.class_id=lessons.class_id and ct.user_id=auth.uid())))
 with check (public.current_school_role(school_id) in ('administrador','coordenador') or (public.current_school_role(school_id)='professor' and exists(select 1 from public.class_teachers ct where ct.class_id=lessons.class_id and ct.user_id=auth.uid())));
create policy attendance_school_read on public.attendance for select using (public.current_school_role(school_id) in ('administrador','coordenador','consulta') or (public.current_school_role(school_id)='professor' and exists(select 1 from public.lessons l join public.class_teachers ct on ct.class_id=l.class_id where l.id=attendance.lesson_id and ct.user_id=auth.uid())));
create policy attendance_school_write on public.attendance for all
 using (public.current_school_role(school_id) in ('administrador','coordenador') or (public.current_school_role(school_id)='professor' and exists(select 1 from public.lessons l join public.class_teachers ct on ct.class_id=l.class_id where l.id=attendance.lesson_id and ct.user_id=auth.uid())))
 with check (public.current_school_role(school_id) in ('administrador','coordenador') or (public.current_school_role(school_id)='professor' and exists(select 1 from public.lessons l join public.class_teachers ct on ct.class_id=l.class_id where l.id=attendance.lesson_id and ct.user_id=auth.uid())));

grant execute on function public.create_school(text) to authenticated;
grant execute on function public.join_school(text) to authenticated;
grant execute on function public.current_school_id() to authenticated;
grant execute on function public.current_school_role(uuid) to authenticated;
grant execute on function public.is_school_member(uuid) to authenticated;
notify pgrst, 'reload schema';
