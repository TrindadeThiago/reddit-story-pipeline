# Quickstart: Scripts CLI (os 3 caminhos da revisão)

Guia para validar as User Stories 1, 2 e 3 do spec.md contra os quatro
scripts em `src/scripts/`.

## Pré-requisitos

- Ambiente completo das fases 001–009 (ffmpeg, Piper, WhisperX
  instalados; `.env` preenchido).

## Validação — User Story 1 (geração em lote)

1. Rodar `npm run generate`.
   - **Resultado esperado**: uma pasta em
     `storage/pending-review/<jobId>/` para cada história processada com
     sucesso (cenário 1, SC-001).

## Validação — User Story 2 (os 3 comandos de decisão)

1. Escolher um `jobId` de `storage/pending-review/` e rodar
   `npm run publish -- <jobId>`.
   - **Resultado esperado**: job passa a existir em
     `storage/published/<jobId>/` (cenário 1).
2. Escolher outro `jobId` e rodar `npm run discard -- <jobId>`.
   - **Resultado esperado**: job passa a existir em
     `storage/discarded/<jobId>/` (cenário 2).
3. Escolher outro `jobId` (ainda pendente) e rodar
   `npm run regenerate:elevenlabs -- <jobId>`.
   - **Resultado esperado**: um novo job aparece em
     `storage/pending-review/`, com narração gerada pelo ElevenLabs; o
     job original permanece intocado em `pending-review` (cenário 3).

## Validação — User Story 3 (mensagens de uso e erros claros)

1. Rodar `npm run publish` sem argumento.
   - **Resultado esperado**: mensagem de uso exibida, nenhuma pasta
     alterada (cenário 1, SC-003).
2. Repetir `npm run publish -- <jobId>` para o mesmo `jobId` já publicado
   no passo anterior.
   - **Resultado esperado**: falha com erro claro identificando que o job
     não está mais em `pending-review` (cenário 2, SC-004).
3. Rodar `npm run generate` (ou `regenerate:elevenlabs`) com uma variável
   de ambiente obrigatória removida temporariamente do `.env`.
   - **Resultado esperado**: mensagem identificando qual variável está
     ausente, antes de qualquer chamada de API ser feita.
   - **Status atual conhecido**: antes da correção descrita em
     `research.md`, este passo falha de forma indireta (erro só aparece
     dentro de uma chamada mais profunda), não com uma mensagem direta.

## Critério de conclusão da fase

Todas as validações passam sem intervenção manual além de rodar os
comandos e inspecionar as pastas.
