-- Execute no SQL Editor do Supabase para habilitar salvamento da tela Extras por turma.
create table if not exists public.class_extras (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  education_level text not null default 'Ensino Fundamental' check (education_level in ('Ensino Fundamental', 'Ensino Médio')),
  school_year text not null default '',
  grade text not null default '',
  shift text not null default '',
  period_start text not null default '',
  period_end text not null default '',
  hours text not null default '',
  entries jsonb not null default '[]'::jsonb,
  signature_date text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_extras_one_per_class unique (school_id, class_id)
);

alter table public.class_extras enable row level security;

drop policy if exists "class_extras_select_members" on public.class_extras;
create policy "class_extras_select_members" on public.class_extras
for select to authenticated
using (public.is_school_member(school_id));

drop policy if exists "class_extras_insert_editors" on public.class_extras;
create policy "class_extras_insert_editors" on public.class_extras
for insert to authenticated
with check (
  public.is_school_member(school_id)
  and created_by = auth.uid()
  and exists (select 1 from public.classes c where c.id = class_id and c.school_id = class_extras.school_id)
  and (
    public.current_school_role(school_id) in ('administrador', 'coordenador')
    or exists (select 1 from public.class_teachers ct where ct.school_id = school_id and ct.class_id = class_extras.class_id and ct.user_id = auth.uid())
  )
);

drop policy if exists "class_extras_update_editors" on public.class_extras;
create policy "class_extras_update_editors" on public.class_extras
for update to authenticated
using (
  public.is_school_member(school_id)
  and (public.current_school_role(school_id) in ('administrador', 'coordenador')
    or exists (select 1 from public.class_teachers ct where ct.school_id = class_extras.school_id and ct.class_id = class_extras.class_id and ct.user_id = auth.uid()))
)
with check (
  public.is_school_member(school_id)
  and (public.current_school_role(school_id) in ('administrador', 'coordenador')
    or exists (select 1 from public.class_teachers ct where ct.school_id = class_extras.school_id and ct.class_id = class_extras.class_id and ct.user_id = auth.uid()))
);
