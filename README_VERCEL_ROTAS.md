# Corrigir erro 404 ao atualizar páginas na Vercel

O arquivo `vercel.json` configura um rewrite para que URLs internas do Expo Router, como `/home`, sejam entregues ao `index.html` da aplicação web. Assim, atualizar a página ou abrir um link interno diretamente não deve gerar o 404 da Vercel.

## Publicação
1. Envie `vercel.json` para o repositório GitHub conectado à Vercel.
2. Confirme em **Settings → Build and Deployment**:
   - Build Command: `npx expo export -p web`
   - Output Directory: `dist`
3. Faça um novo deploy (Redeploy ou novo commit) e teste abrir e atualizar `https://presenca.cbtecnologia.tec.br/home`.

Se continuar em 404, confirme que a implantação foi feita a partir do commit que contém `vercel.json` e que o domínio está atribuído ao projeto correto.
