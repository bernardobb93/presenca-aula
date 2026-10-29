-- Boletim por disciplina: adiciona a disciplina a cada avaliação existente.
alter table public.student_evaluations
  add column if not exists subject text;

update public.student_evaluations
set subject = 'Sem disciplina'
where subject is null or btrim(subject) = '';

alter table public.student_evaluations
  alter column subject set default 'Sem disciplina';

-- Coluna não é obrigatória para compatibilidade com integrações antigas.
