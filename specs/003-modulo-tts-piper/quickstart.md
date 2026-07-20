# Quickstart: Módulo TTS — Piper + interface plugável

Guia para validar as User Stories 1 e 2 do spec.md contra
`src/modules/tts/{piperProvider,ttsProvider}.ts`.

## Pré-requisitos

- Ambiente da fase 001 pronto, incluindo o binário Piper instalado e
  `PIPER_MODEL_PATH` apontando para um modelo de voz pt-BR válido.

## Validação — User Story 1 (narração local pt-BR)

1. Instanciar `PiperProvider` com o `modelPath` configurado.
2. Chamar `synthesize(texto, "output-teste.wav")` com um texto real de
   história (2000+ caracteres — reaproveitar uma história obtida pela
   fase 02).
   - **Resultado esperado**: arquivo de áudio válido criado em
     `output-teste.wav` (cenário 1).
3. Reproduzir o áudio gerado.
   - **Resultado esperado**: fala em português, cobrindo o texto inteiro,
     sem cortar no meio (cenários 2 e 3).

## Validação — User Story 2 (contrato plugável)

1. Inspecionar o resultado de `synthesize` e confirmar que
   `NarrationResult.provider === "piper"` (cenário 1).
2. Confirmar, por leitura de código, que nenhum outro módulo do pipeline
   (legendas, composição de vídeo, orquestrador) importa `PiperProvider`
   diretamente — todos devem depender apenas do tipo `TtsProvider`
   (cenário 2, antecipando a fase 08).

## Critério de conclusão da fase

Ambas as validações passam sem intervenção manual além de reproduzir o
áudio para checar a qualidade da fala.
