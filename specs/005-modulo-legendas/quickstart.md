# Quickstart: Módulo de Legendas (WhisperX)

Guia para validar as User Stories 1 e 2 do spec.md contra
`scripts/transcribe.py` e `src/modules/captions/generateCaptions.ts`.

## Pré-requisitos

- WhisperX instalado (`pip install whisperx`) e o modelo de alinhamento
  em português já baixado (fase 001).
- Um arquivo de áudio real de narração (gerado pela fase 03 ou 04).

## Validação — User Story 1 (legenda sincronizada)

1. Chamar `generateCaptions(audioPath, "teste.srt", "base")` com um áudio
   real.
   - **Resultado esperado**: `teste.srt` é criado e é um `.srt` válido
     (timestamps no formato `HH:MM:SS,mmm --> HH:MM:SS,mmm`);
     `teste.srt.words.json` contém uma lista de palavras com
     `startSeconds`/`endSeconds` (cenário 1).
2. Abrir `teste.srt` em qualquer player de vídeo ou visualizador de
   legenda.
   - **Resultado esperado**: o texto está em português e os tempos
     parecem plausíveis (cenário 2).
3. Reproduzir o áudio original ao lado da legenda gerada.
   - **Resultado esperado**: os timestamps batem com a fala dentro de uma
     margem imperceptível (cenário 3, SC-002).

## Validação — User Story 2 (tolerância a trechos ruins)

1. Usar um áudio com algum trecho de ruído/silêncio no meio.
2. Chamar `generateCaptions` normalmente.
   - **Resultado esperado**: o processo completa sem erro; a lista de
     palavras não inclui entradas para o trecho problemático, mas o
     restante da legenda é gerado normalmente (cenário 1, SC-003).

## Critério de conclusão da fase

Ambas as validações passam sem intervenção manual além da checagem
auditiva; o `.srt` gerado é aceito sem modificação como entrada válida
pela fase 07 (SC-004) — validar isso quando a fase 07 estiver
implementada/revisada.
