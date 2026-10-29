# Presença & Aula — v1

Aplicativo multiplataforma para Android/iOS com:
- cadastro de turmas e alunos;
- chamada por aula;
- status presente/ausente/justificado;
- planos de aula;
- anexos de documentos;
- histórico;
- armazenamento local/offline.

## Rodar

Requisitos: Node.js LTS e Expo.

```bash
npm install
npx expo start
```

Depois:
- pressione `a` para Android;
- pressione `i` para iOS (macOS + Xcode);
- ou abra no Expo Go.

## Estrutura

- `app/` telas e navegação
- `src/context/` estado local
- `src/types/` modelos
- `src/components/` componentes reutilizáveis

## Próxima etapa

A v1 é offline-first. Para produção, conectar Supabase/Firebase para login, sincronização, banco remoto e armazenamento de anexos.
## Correção do Supabase / PostgREST

Se o navegador mostrar `POST /rest/v1/classes?select=* 400` ou `POST /rest/v1/students?select=* 400`, abra o SQL Editor do Supabase e execute:

```sql
notify pgrst, 'reload schema';
```

O arquivo `supabase/refresh_schema.sql` contém esse comando.

A versão atual do aplicativo não depende de `.select().single()` depois de INSERT. Ela gera UUIDs válidos no cliente, grava diretamente e atualiza a tela localmente após o Supabase confirmar a operação. Os erros do Supabase agora exibem código, mensagem, detalhes e dica quando disponíveis.


## Gestão por escola (novo)

A tela **Minha escola** permite criar uma escola, entrar com código de convite, consultar membros, alterar os perfis (quando administrador) e atribuir professores às turmas. Os perfis disponíveis são `administrador`, `coordenador`, `professor` e `consulta`.

### Ativar no Supabase

1. Faça backup do banco antes de aplicar mudanças.
2. No SQL Editor do Supabase, execute `supabase/school_management.sql` depois do `supabase/schema.sql`. O script cria escolas, membros, vínculos professor-turma, migra os registros atuais para uma escola por proprietário e ativa políticas RLS por escola/perfil.
3. Reinicie o app. Entre com a conta existente e abra **Minha escola**. Contas sem escola podem criar uma; os demais entram usando o código de convite.

A atribuição de professores é feita na tela Minha escola. Os registros de turmas, alunos, aulas e chamadas passam a ser compartilhados conforme o papel e os vínculos de turma definidos no banco. O modo local continua disponível quando o Supabase não está configurado.

## Cadastro de professores, senha e vínculo com turmas

Esta versão inclui:
- campo de nome completo ao criar uma conta de professor;
- página **Alterar senha** no painel, usando Supabase Auth;
- nomes dos professores na tela **Minha escola** e seleção de professores por turma.

Antes de testar essas funções, execute `supabase/teacher_profiles_password.sql` no SQL Editor do Supabase, depois de `schema.sql` e `school_management.sql`. O script cria `public.profiles`, protege os dados com RLS e sincroniza o nome informado no cadastro. Para associar professores às turmas, entre em **Minha escola → Atribuição de professores às turmas** e marque os professores desejados. O acesso a dados continua condicionado às políticas RLS da migração de gestão escolar.

Observação: alteração de senha funciona para o usuário que está autenticado. Para redefinição quando o usuário não consegue entrar, use o fluxo “Esqueci minha senha” do Supabase Auth, que é um fluxo separado.

### Remover membros ou excluir contas de professores

A tela **Gestão da escola → Membros e níveis de acesso** oferece ao administrador duas ações:
- **Remover da escola**: remove o vínculo e as atribuições às turmas dessa escola; a conta do professor continua ativa.
- **Excluir conta**: exclui a conta do Supabase Auth e, portanto, impede o login com essa conta. A exclusão pode afetar o acesso do usuário a outras escolas e não pode ser desfeita.

A exclusão de conta é executada por uma Supabase Edge Function para que a chave `service_role` nunca seja incluída no aplicativo. Para ativar, faça deploy da função `supabase/functions/delete-user` usando o Supabase CLI, por exemplo:

```bash
supabase functions deploy delete-user
```

Confira no projeto Supabase os secrets da função `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. O Supabase normalmente fornece `SUPABASE_URL` e `SUPABASE_ANON_KEY`; configure a `SUPABASE_SERVICE_ROLE_KEY` como secret da função, nunca no app nem no arquivo `.env` distribuído. A função valida a sessão e exige que o solicitante seja administrador daquela escola. Por segurança, ela não permite remover o próprio usuário nem o usuário que criou a escola.

Antes de usar em produção, teste primeiro em um projeto Supabase de desenvolvimento e faça backup dos dados importantes.

## Somente administradores podem gerenciar turmas

Execute `supabase/classes_admin_only.sql` no SQL Editor do Supabase depois de `school_management.sql`. A tela “Minhas turmas” oculta criação/edição/exclusão para perfis que não sejam administradores; a política RLS também bloqueia essas operações no banco. A leitura de turmas continua sujeita às políticas de acesso existentes.

## Permissões de acesso dos professores às turmas

Para garantir que cada professor veja somente as turmas às quais foi designado, execute `supabase/teacher_assigned_classes_only.sql` no SQL Editor do Supabase **depois** de `school_management.sql` e `classes_admin_only.sql`. A regra é aplicada no banco com RLS para turmas, alunos, planos de aula e frequência; esconder itens na interface, por si só, não seria suficiente. Atribua cada professor à turma em Gestão da escola.


## Correção de acesso às turmas (outubro/2026)

Para impedir que políticas antigas continuem liberando acesso por serem combinadas com OR no Supabase RLS, execute `supabase/teacher_assigned_classes_only.sql` no SQL Editor. Essa migração remove políticas antigas de dono/edição de turmas e deixa criação, edição e exclusão restritas ao administrador. O aplicativo também deixa de mostrar cache antigo quando uma atualização online falha.

## Correção lista de turmas

## Correção Anexos

## Atualizações

