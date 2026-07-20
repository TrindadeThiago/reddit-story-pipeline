# Quickstart: Setup do Projeto

Guia para validar que o esqueleto do projeto está pronto (User Stories 1 e 2 do spec.md).

## Pré-requisitos

- Node.js e um gerenciador de pacotes compatível instalados.
- Python 3 instalado (para WhisperX).
- ffmpeg instalável no sistema (via gerenciador de pacotes do SO).
- Binário do Piper + modelo de voz pt-BR disponível para download.

## Passos de validação — User Story 1 (ambiente pronto)

1. Clonar o repositório.
2. Instalar as dependências do projeto.
   - **Resultado esperado**: conclui sem erros (SC-001, cenário 1 do spec).
3. Rodar a checagem de tipos (`tsc --noEmit` ou equivalente).
   - **Resultado esperado**: conclui sem erros, mesmo sem lógica de negócio
     implementada (cenário 2).
4. Inspecionar a árvore de pastas (ver `data-model.md` para a lista
   completa).
   - **Resultado esperado**: existem pastas para cada módulo futuro
     (`reddit`, `tts`, `captions`, `video`, `review`) e para os 4 estados
     de armazenamento (`pending-review`, `approved`, `published`,
     `discarded`) (cenário 3).

## Passos de validação — User Story 2 (variáveis de ambiente e dependências externas)

1. Abrir `.env.example` e comparar com a tabela de variáveis em
   `data-model.md`.
   - **Resultado esperado**: nenhuma variável usada pelas fases 02–07 está
     faltando (SC-002).
2. Seguir a documentação de instalação manual (README) para ffmpeg, Piper
   e WhisperX.
3. Rodar as verificações básicas:
   ```sh
   ffmpeg -version
   piper --help
   python3 -c "import whisperx"
   ```
   - **Resultado esperado**: os três comandos respondem sem erro (SC-003).

## Critério de conclusão da fase

Todos os passos acima executam com o resultado esperado, e nenhuma pasta
de primeiro nível nova precisou ser criada para acomodar as fases
seguintes (SC-004) — isso só pode ser confirmado retroativamente após as
fases 02–10 serem implementadas.
