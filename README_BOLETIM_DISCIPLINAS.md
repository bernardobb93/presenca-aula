# Atualização do boletim por disciplina

## Alterações
- O boletim mantém a seleção de turma, aluno e período.
- Em vez de listar cada avaliação e sua data, apresenta um resumo por disciplina: média na escala 0–10, quantidade de notas e presenças/aulas.
- A frequência geral mantém os totais de aulas cadastradas, chamadas registradas, presenças, faltas e justificadas.
- A tela de Registro de presença remove o texto literal `\\n \\n` que aparecia abaixo da disciplina.
- O cadastro de avaliação agora permite selecionar a disciplina da turma para que as notas sejam agrupadas corretamente no boletim.

## Importante: migração do Supabase
Antes de salvar avaliações com disciplina, execute `supabase/boletim_resumo_por_disciplina.sql` no SQL Editor do Supabase.

Avaliações antigas sem disciplina ficarão como **Sem disciplina**; edite-as para atribuir a matéria correta. O resumo de presença por matéria depende do título da aula no formato `Aula de NOME DA DISCIPLINA`, que é o formato utilizado pelo Registro de presença.

A alteração foi feita no código e o ZIP foi verificado estruturalmente, mas não foi possível testar com o Supabase remoto.
