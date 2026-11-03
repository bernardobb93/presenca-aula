# Correção: múltiplas aulas e chamadas independentes

## Ordem de aplicação
1. Faça um backup do projeto e do banco Supabase.
2. No Supabase, abra SQL Editor e execute o arquivo `supabase/multiplas_aulas_por_disciplina_rls.sql` completo.
3. Confirme que a execução terminou sem erro.
4. Publique o conteúdo da pasta `lesson_fix` no Vercel, mantendo as variáveis de ambiente atuais.

## O que muda
- Cada registro de aula de chamada passa a guardar `class_subject_id`.
- O professor só pode inserir/editar/excluir aulas e chamadas da disciplina atribuída na escola e turma correspondentes.
- É possível criar mais de uma aula para a mesma disciplina, turma e data; cada aula recebe um `id` próprio e, portanto, uma chamada independente.
- A tela permite selecionar chamadas anteriores e adicionar outra aula.
- Aulas e chamadas antigas não são apagadas. O SQL tenta associar aulas antigas no padrão `Aula de <disciplina>`; as demais permanecem preservadas sem vínculo de disciplina.
- Planos de aula continuam usando `lessons` e podem manter título livre. Para professores, planos sem disciplina vinculada continuam acessíveis quando existe alguma disciplina atribuída na turma.

## Observações importantes
- O SQL não altera nem apaga `attendance.items`, planos ou anexos.
- O vínculo de disciplina das aulas antigas é preenchido apenas quando turma, escola e título correspondem exatamente.
- Faça a migração antes de publicar o novo frontend, para que a coluna `class_subject_id` já exista.
- A validação final do RLS deve ser feita entrando no app com uma conta de professor e tentando registrar chamada em uma disciplina atribuída e em outra não atribuída.
