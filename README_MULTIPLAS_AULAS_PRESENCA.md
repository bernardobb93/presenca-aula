# Várias aulas da mesma disciplina no mesmo dia

Na tela **Registro de presença**, use o seletor **Aula desta disciplina neste dia** para escolher Aula 1, Aula 2, Aula 3 etc. Cada número gera um registro de aula separado e, portanto, uma chamada independente para cada aluno. É possível registrar presença em uma aula e falta em outra, sem sobrescrever a chamada anterior.

- A aula é identificada pela turma, data, disciplina e número da aula (guardado no título da aula).
- Para corrigir uma chamada, selecione o mesmo número e salve novamente.
- Registros antigos com o título `Aula de [disciplina]` continuam sendo reconhecidos como Aula 1 para evitar criar uma chamada duplicada ao abrir registros existentes.
- Não é necessário alterar o esquema do banco para essa implementação, pois cada aula já é armazenada como um registro separado.
