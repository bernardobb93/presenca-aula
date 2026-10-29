# Correção da tela branca

Esta atualização:
- mostra um indicador enquanto a página inicial verifica a sessão;
- redireciona para o login se a leitura da sessão falhar, em vez de deixar a página em branco;
- usa o armazenamento padrão do navegador para sessões Web e AsyncStorage no Android/iOS.

## Instalação
1. Extraia o ZIP numa pasta nova ou faça backup da pasta atual.
2. Preserve seu `.env` (não compartilhe esse arquivo).
3. Abra o terminal na pasta do projeto e execute:
   npm install
   npx expo start --web --clear

Se ainda ficar em branco, abra o terminal onde executou Expo e copie as primeiras mensagens vermelhas. No Chrome, F12 > Console também pode mostrar o erro.
