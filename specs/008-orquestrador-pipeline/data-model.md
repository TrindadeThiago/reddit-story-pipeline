# Data Model: Orquestrador do Pipeline

## RunPipelineDeps (parâmetro de entrada)

| Campo | Tipo | Descrição |
|---|---|---|
| `ttsProvider` | `TtsProvider` | Piper (padrão) ou ElevenLabs (regeneração) — injetado, contrato fixo (fase 03) |
| `pexelsApiKey` | string | Chave de API para busca de vídeo de fundo (fase 06) |
| `whisperModelSize` | string | Tamanho do modelo de transcrição (fase 05) |
| `backgroundQuery` | string | Descrição de cena para a busca de vídeo de fundo (fase 06) |

## PipelineJob (reaproveitado de `src/types.ts`, preenchido incrementalmente)

| Campo | Tipo | Preenchido em qual etapa |
|---|---|---|
| `jobId` | string | Início da execução — `${story.id}-${Date.now()}` |
| `story` | `RedditStory` | Recebido como parâmetro |
| `narration` | `NarrationResult?` | Após `ttsProvider.synthesize` |
| `captions` | `CaptionResult?` | Após `generateCaptions` |
| `video` | `ComposedVideo?` | Após `composeVideo` |

## Vídeo de fundo local (novo, interno à execução)

Não é um campo de `PipelineJob` — é um caminho intermediário usado só
dentro de `runPipelineForStory`.

| Campo | Tipo | Descrição |
|---|---|---|
| `backgroundVideoLocalPath` | string | `join(workDir, "background.mp4")` — destino do download de `background.downloadUrl` (fase 06), antes de ser passado para `composeVideo` (fase 07) |

## Erro de etapa (conceito, não persistido)

Cada falha propagada MUST identificar:

| Campo conceitual | Descrição |
|---|---|
| Etapa | Qual das cinco etapas estava em andamento (narração, legenda, vídeo de fundo, composição, enfileiramento) |
| Causa original | O erro original lançado pelo módulo daquela etapa, preservado |
