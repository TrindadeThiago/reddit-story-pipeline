# Quickstart: Módulo de Composição de Vídeo (ffmpeg)

Guia para validar as User Stories 1 e 2 do spec.md contra
`src/modules/video/composeVideo.ts`.

## Pré-requisitos

- ffmpeg instalado com suporte a `libx264` e ao filtro `subtitles`
  (pré-requisito da fase 001).
- Um áudio de narração real (fase 03/04), um vídeo de fundo local (baixado
  a partir da URL da fase 06) e uma legenda `.srt` real (fase 05).

## Validação — User Story 1 (montagem do vídeo final)

1. Chamar `composeVideo({ narrationAudioPath, backgroundVideoPath, srtCaptionsPath, outputPath })`
   com os três insumos reais.
   - **Resultado esperado**: `.mp4` gerado em `outputPath`, formato
     retrato (cenário 1).
2. Testar com um vídeo de fundo mais curto que a narração, e depois com
   um mais longo.
   - **Resultado esperado**: em ambos os casos, a duração do vídeo final
     bate com a duração da narração (cenário 2, SC-002).
3. Assistir o vídeo final.
   - **Resultado esperado**: legenda visível e sincronizada com a fala
     (cenário 3); áudio e vídeo não aparentam dessincronizados (cenário
     4, SC-003).

## Validação — User Story 2 (erro claro por arquivo ausente)

1. Chamar `composeVideo` com `narrationAudioPath` apontando para um
   arquivo inexistente (mantendo os outros dois válidos).
   - **Resultado esperado**: erro identificando que o áudio de narração
     não foi encontrado, antes de qualquer processamento longo pelo
     ffmpeg.
2. Repetir trocando o arquivo ausente para `backgroundVideoPath`, depois
   para `srtCaptionsPath`.
   - **Resultado esperado**: em cada caso, o erro identifica
     especificamente qual dos três arquivos está faltando (cenário 1,
     SC-004).

## Critério de conclusão da fase

Ambas as validações passam sem intervenção manual além da checagem
auditiva/visual do vídeo final.
