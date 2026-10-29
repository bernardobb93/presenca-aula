# Gestão Escolar — Registro de avaliações

Foi adicionada a tela Avaliações ao painel inicial. Ela permite selecionar turma e aluno, registrar nome/data/nota/nota máxima/observações e calcular a média aritmética das notas convertidas para escala 0–10.

## Ativar no Supabase
1. Abra o SQL Editor do projeto.
2. Execute `supabase/student_evaluations.sql`.
3. Publique os arquivos atualizados na Vercel.

A migração cria a tabela `student_evaluations` e políticas RLS para limitar acesso por escola e turma atribuída. Administradores e coordenadores podem gerenciar avaliações da escola; professores apenas nas turmas atribuídas; perfil consulta tem leitura.

A média é calculada sobre as avaliações do aluno selecionado na turma atual, convertendo cada nota proporcionalmente para escala de 0 a 10. Para funcionamento persistente online, o SQL precisa ser executado no Supabase.
