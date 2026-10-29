# Calendário escolar

Foi adicionada a tela `app/calendar.tsx`, acessível pelo painel inicial em **Calendário**.

Recursos:
- Calendário mensal com navegação entre meses e indicação de dias com compromissos.
- Cadastro, edição e exclusão de avaliações, datas importantes e eventos escolares.
- Campos opcionais de turma, disciplina e observações.
- Datas apresentadas como `DD-MM-AAAA` e armazenadas no banco como `DATE`.
- Registros online por escola selecionada no Supabase; modo local utiliza AsyncStorage.

## Ativação no Supabase

No SQL Editor do projeto Supabase, execute `supabase/calendar_events.sql` depois de ter aplicado `supabase/school_management.sql`. A tabela tem políticas RLS para que usuários autenticados só vejam e alterem eventos das escolas das quais são membros.

O ZIP não executa migrações automaticamente. Depois de aplicar a migração, recarregue o app e abra **Calendário**.
