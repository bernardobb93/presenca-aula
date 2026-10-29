# Ajustes de datas e impressão do boletim

- As telas de chamada, histórico, planos de aula, avaliações, alunos e boletim exibem datas no padrão `DD-MM-AAAA`.
- O app converte as datas digitadas para `YYYY-MM-DD` antes de filtrar ou salvar no Supabase, mantendo o formato ISO no banco.
- O boletim inclui período formatado, data de emissão, resumo por disciplina, notas (soma/máximo), frequência, contagem de aulas e linhas de assinatura.
- No navegador, use **Imprimir / Salvar em PDF** e selecione papel A4 e “Salvar como PDF”. O layout de impressão oculta a interface do aplicativo e mantém o boletim.

## Verificação

Foi executado `npx tsc --noEmit`. O compilador apontou um erro novo na propriedade `nativeID` de `TouchableOpacity`, que foi corrigido; permanecem erros preexistentes em `src/context/AppContext.tsx`, `src/lib/exportXml.ts` e `supabase/functions/delete-user/index.ts` (ambiente Deno não incluído no TypeScript da aplicação). O projeto ainda precisa ser validado no navegador e conectado ao Supabase real.
