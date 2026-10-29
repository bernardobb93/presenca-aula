-- Presença & Aula: nome dos professores e perfis visíveis à escola.
-- Execute uma vez no Supabase SQL Editor, depois do schema.sql e school_management.sql.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;

drop policy if exists profiles_read_self_or_school on public.profiles;
create policy profiles_read_self_or_school on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1 from public.school_members mine
    join public.school_members theirs on theirs.school_id = mine.school_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.id
  )
);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (id = (select auth.uid()));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do update set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_created on auth.users;
create trigger on_auth_user_profile_created
after insert or update of raw_user_meta_data on auth.users
for each row execute function public.handle_new_profile();

-- Preenche perfis de contas existentes sem substituir nomes já cadastrados.
insert into public.profiles (id, full_name)
select id, nullif(trim(raw_user_meta_data ->> 'full_name'), '')
from auth.users
on conflict (id) do update set
  full_name = coalesce(public.profiles.full_name, excluded.full_name),
  updated_at = now();
