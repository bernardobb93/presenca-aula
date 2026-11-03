# Restauração do Calendário escolar

Esta versão restaura a tela `app/calendar.tsx` e o atalho **Calendário** no painel inicial, preservando o restante do projeto da correção de acesso do professor.

Foi incluída também a migração `supabase/calendar_events.sql`. Se a tabela `calendar_events` ainda não existir no seu projeto Supabase, execute esse arquivo no SQL Editor.

## Sobre o seletor de escola

O painel exibe o seletor somente quando existem duas ou mais escolas válidas vinculadas à conta. Na captura enviada aparecem duas opções: “Maria” e “carber1327 — Escola”. O código não deve excluir uma delas automaticamente, pois isso poderia retirar o acesso à escola correta. É necessário confirmar qual opção é a escola válida e qual deve deixar de aparecer.

## Publicação

Extraia o ZIP, substitua os arquivos do projeto e publique novamente na Vercel.
