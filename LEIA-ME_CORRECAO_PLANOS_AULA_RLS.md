# Correção do erro ao salvar Planos de Aula

O erro `Supabase 42501: new row violates row-level security policy for table "lessons"` era causado por uma regra de gravação que exigia que o título do plano fosse exatamente `Aula de <disciplina>`. A tela de Planos de Aula aceita título livre, então a regra podia rejeitar um plano válido.

## Como aplicar

1. Abra o Supabase do projeto correto.
2. Entre em **SQL Editor**.
3. Abra e execute `supabase/fix_lessons_rls_insert.sql`.
4. Entre novamente no Gestão Escolar e tente salvar um plano.

A regra nova permite salvar para administrador/coordenador da escola e para professor que tenha ao menos uma disciplina atribuída naquela turma. Ela não remove nem altera planos já salvos.

Se continuar dando erro, confira se o usuário está vinculado à escola ativa com papel `administrador`, `coordenador` ou `professor`, e se a disciplina da turma está atribuída ao mesmo usuário em `class_subject_teachers`.

A alteração SQL não foi executada no seu Supabase; precisa ser aplicada no SQL Editor. O ZIP contém o projeto e a migração.
