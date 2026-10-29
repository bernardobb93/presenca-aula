# Correção de login — Presença & Aula

## O que foi corrigido
- Mensagens de erro visíveis na própria tela Web (Alert.alert não é confiável no navegador).
- Validação de e-mail/senha e indicador de carregamento.
- Mensagens amigáveis para credenciais inválidas, e-mail não confirmado e falha de conexão.
- Tratamento de exceções para que a tela não falhe silenciosamente.
- Detecção básica de configuração Supabase ausente/inválida.

## Configuração
1. Na pasta principal, copie `.env.example` para `.env`.
2. Preencha `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com os valores do seu projeto.
3. No terminal, pare o Expo com Ctrl+C.
4. Execute `npx expo start --web --clear`.

Exemplo de `.env` (substitua pelos valores reais):
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua_chave_publishable

Use somente a publishable/anon key no cliente. Nunca use service_role/secret key.

## Teste
- Clique em Entrar com campos vazios: a tela deve mostrar uma mensagem.
- Tente credenciais incorretas: deve aparecer o erro na tela.
- Para criar conta, use "Primeiro acesso? Criar uma conta".
- Se o cadastro exigir confirmação por e-mail, confirme o e-mail antes de entrar.
