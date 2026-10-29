Correções desta versão:
- Na coluna Notas do boletim, mostra soma das notas / soma dos valores máximos no período, em vez da contagem de avaliações.
- Na tela Registro de avaliações, professor vê e pode escolher apenas disciplinas atribuídas a ele na turma.
- SQL adicional: supabase/evaluations_limit_to_assigned_subject.sql. Execute no SQL Editor do Supabase para aplicar a restrição também no banco.
- Administradores/coordenadores continuam vendo as disciplinas cadastradas da turma.
Importante: faça backup das políticas RLS antes de executar o SQL. A aplicação não foi testada contra o Supabase remoto.
