# Data Model: Módulo de Composição de Vídeo (ffmpeg)

## ComposeOptions (parâmetros de entrada)

| Campo | Tipo | Descrição |
|---|---|---|
| `narrationAudioPath` | string | Caminho do áudio de narração (fase 03/04) |
| `backgroundVideoPath` | string | Caminho do vídeo de fundo já baixado/disponível localmente (fase 06 fornece a URL; o download em si é assumido já feito antes de chamar este módulo) |
| `srtCaptionsPath` | string | Caminho da legenda `.srt` (fase 05) |
| `outputPath` | string | Caminho de saída desejado para o `.mp4` final |

**Regra de validação a adicionar**: os três caminhos de entrada
(`narrationAudioPath`, `backgroundVideoPath`, `srtCaptionsPath`) MUST
existir no sistema de arquivos antes do processamento começar (FR-006).

## ComposedVideo (resultado)

| Campo | Tipo | Descrição |
|---|---|---|
| `videoFilePath` | string | Caminho do `.mp4` final gerado, igual a `outputPath` |

Reaproveitado de `src/types.ts`, sem alterações — já consumido pela fila
de revisão (fase 09) via `PipelineJob.video`.
