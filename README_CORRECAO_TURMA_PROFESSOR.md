# Correção: turma não aparece para o professor designado

## Causa corrigida
A tela de Gestão da escola salva a atribuição em `class_subject_teachers`, mas a política de leitura das turmas verificava apenas a tabela antiga `class_teachers`. Assim, a atribuição por disciplina não liberava a turma na consulta do professor.

## Aplicação
1. Faça backup das políticas atuais do Supabase.
2. No SQL Editor, confirme que já foram executadas as migrações `school_management.sql`, `multiple_subjects_attendance.sql`, `class_subject_teachers.sql` e `classes_admin_only.sql`.
3. Execute `supabase/teacher_assigned_classes_only.sql`.
4. Na Gestão da escola, marque o professor na disciplina da turma e confirme que o status mostra **Atribuído**.
5. O professor deve sair e entrar novamente ou atualizar a página.

A política dá acesso à turma se o professor estiver atribuído a pelo menos uma disciplina dela. As políticas de alunos, planos de aula e chamadas também usam essa atribuição. Administradores, coordenadores e usuários de consulta mantêm o acesso definido pelo papel.

## Importante
Este pacote contém a correção do código SQL, mas não altera automaticamente o banco remoto. Verifique as políticas RLS no Supabase e teste com uma conta de professor antes de publicar.
