# Recuperação de senha

A tela de login agora oferece **Esqueci minha senha**. O usuário informa o e-mail cadastrado, recebe um link do Supabase e define uma nova senha na rota `/redefinir-senha`.

## Configuração obrigatória no Supabase

No painel do Supabase, abra **Authentication → URL Configuration** e adicione às **Redirect URLs** o endereço:

`https://presenca.cbtecnologia.tec.br/redefinir-senha`

Mantenha também a URL principal do aplicativo na lista de redirecionamentos. O endereço usado pelo pedido é montado com base na origem atual do app, seguido de `/redefinir-senha`.

Confira em **Authentication → Email Templates** se o template **Reset Password** está habilitado e personalizado, se necessário. A entrega depende da configuração SMTP do projeto.

## Fluxo

1. Na tela de login, clique em **Esqueci minha senha**.
2. Informe o e-mail cadastrado e solicite o link.
3. Abra o link recebido no mesmo domínio do aplicativo.
4. Informe e confirme a nova senha (mínimo de 6 caracteres).
5. Após a confirmação, volte ao login e entre com a nova senha.
