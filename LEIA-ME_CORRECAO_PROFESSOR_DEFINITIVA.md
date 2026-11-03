# Correção do acesso às turmas do professor

Esta atualização corrige a política de leitura das turmas e dos alunos para o modelo atual de atribuição por disciplina (`class_subjects` + `class_subject_teachers`). Também migra, sem apagar, atribuições que ainda estejam registradas no modelo antigo (`class_teachers`) para as disciplinas existentes.

## Passos obrigatórios

1. Abra o projeto Supabase correto.
2. Entre em **SQL Editor** e execute o arquivo `supabase/corrigir_acesso_turmas_professor_definitivo.sql` inteiro.
3. Confira a tabela de resultados no final: deve aparecer a escola, turma, disciplina e professor atribuído.
4. Se o professor não aparecer no resultado, abra **Gestão da escola** com a conta administradora e marque o professor na disciplina da turma. Salve e confira novamente o resultado SQL.
5. Faça logout/login na conta do professor e atualize o navegador.

## Importante

A migração não inventa atribuições novas. Ela recupera atribuições antigas quando existem em `class_teachers`. No modelo atual, cada professor precisa estar vinculado a pelo menos uma disciplina da turma. Se a consulta final não retornar uma linha para o professor esperado, o vínculo não existe ou está associado a outro usuário; nesse caso, confira o e-mail/conta selecionada na tela de Gestão da escola.

O ZIP contém o projeto e a migração SQL. A migração precisa ser executada no Supabase; publicar apenas o código na Vercel não altera as políticas do banco.
