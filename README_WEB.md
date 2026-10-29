# Presença & Aula — Web + Supabase

## 1. Instalar
```bash
npm install
```

## 2. Supabase
No Supabase > SQL Editor, execute `supabase/schema.sql`.
Depois copie `.env.example` para `.env` e preencha a URL e a Publishable Key.

## 3. Rodar Web
```bash
npx expo start --web
```

## 4. Fluxo
Login/cadastro → Minhas turmas → abrir turma → adicionar/editar/excluir alunos.
Os registros são sincronizados com o Supabase quando configurado. Sem `.env`, o projeto entra em modo local para testes.

## Observação
Para cadastro/login real, crie um usuário em Authentication ou use a tela de cadastro. Se a confirmação de e-mail estiver habilitada, confirme o e-mail antes de entrar.

## Novos recursos
- **Planos de aula**: lista completa, abrir/editar e excluir planos.
- **Exportar Excel XML**: na tela Planos de aula, use “Exportar Excel XML”. O arquivo abre no Excel e contém as abas Turmas, Alunos, Planos de Aula e Presenças.
