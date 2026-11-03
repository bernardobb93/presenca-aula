# Ajustes para celular

- Removido do painel inicial o seletor extra de escola que aparecia abaixo do título "Painel escolar". O painel continua usando a escola ativa definida no contexto do aplicativo; as demais funções de gestão de escolas permanecem disponíveis.
- Calendário adaptado para telas estreitas: conteúdo com margens menores, cartões empilhados em uma coluna, grade mensal compacta, botões de navegação menores e títulos ajustados.
- No computador, a disposição em colunas e os espaçamentos originais são preservados.

Validação: `npx tsc --noEmit` foi executado. O projeto ainda apresenta erros preexistentes em `src/context/AppContext.tsx`, `src/lib/exportXml.ts` e `supabase/functions/delete-user/index.ts`; não foram apontados erros nos arquivos `app/home.tsx` e `app/calendar.tsx` modificados.
