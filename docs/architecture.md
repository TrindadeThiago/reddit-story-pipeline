# Arquitetura

## Visão geral

O sistema é um **pipeline batch, executado por CLI**, sem servidor nem banco
de dados. Cada execução processa um lote de histórias (do Reddit ou de um
arquivo manual), gera um vídeo pronto para revisão por história, e para. A
decisão de publicar/regenerar/descartar cada vídeo é sempre humana, feita
rodando outro comando CLI apontando para o `jobId`.

```
                    ┌────────────────────┐
                    │   fonte de histórias │
                    │  Reddit (OAuth)      │
                    │  ou --input <arquivo>│
                    └──────────┬──────────┘
                               │ RedditStory[]
                               ▼
              ┌───────────────────────────────────┐
              │  runPipelineForStory (por história) │
              │  (src/pipeline.ts)                   │
              └───────────────────────────────────┘
                               │
      ┌─────────────┬─────────┼─────────┬──────────────┐
      ▼             ▼         ▼         ▼              ▼
  1. narração   2. legenda  3. vídeo   4. composição  5. enfileiramento
  (TtsProvider) (WhisperX)  de fundo   (ffmpeg)       (reviewQueue)
                             (Pexels ou
                              pack local)
                               │
                               ▼
                 storage/pending-review/<jobId>/
                               │
                     REVISÃO MANUAL (humano assiste ao final.mp4)
                               │
              ┌────────────────┼────────────────────┐
              ▼                ▼                     ▼
        yarn run publish   yarn discard   yarn regenerate:elevenlabs
        → approved →            → discarded    → reroda 1–5 com ElevenLabs,
          published                              cria job NOVO
```

## Princípios de design

### 1. TTS plugável (`TtsProvider`)

`PiperProvider` e `ElevenLabsProvider` implementam a mesma interface
(`src/modules/tts/ttsProvider.ts`). Todo o resto do pipeline — legendas,
vídeo, fila de revisão — trabalha só com o resultado (`NarrationResult`),
nunca sabe qual provider gerou o áudio. Isso é o que permite o "caminho 2"
da revisão (`regenerate:elevenlabs`) reusar `runPipelineForStory` sem
duplicar lógica: só troca a dependência injetada.

### 2. Fila de revisão = filesystem, não banco

`storage/{pending-review,approved,published,discarded}/<jobId>/` é a fonte
da verdade sobre o estado de cada job. Não há tabela, não há índice — um
`readdir` já é a "listagem de jobs pendentes", e mover um job entre estados
é um `rename` de diretório (`src/modules/review/reviewQueue.ts`). Escolha
deliberada: o volume esperado (poucas dezenas de vídeos por execução, revisão
manual) não justifica um banco. Ver [roadmap](./roadmap.md) para quando essa
escolha deveria ser revisitada.

### 3. Isolamento de falha por unidade de trabalho

- Por **subreddit**: se buscar histórias em `r/X` falhar, `fetchStories`
  loga o erro e continua para o próximo subreddit da lista — não aborta a
  busca inteira.
- Por **história/job**: se o pipeline falhar processando a história N,
  isso não impede que as histórias N+1, N+2... da mesma execução sejam
  processadas (o loop em `run-pipeline.ts` segue adiante).
- Por **etapa dentro de um job**: `runStage` (em `src/pipeline.ts`) envolve
  cada etapa (narração/legenda/vídeo de fundo/composição/enfileiramento) e
  recontextualiza qualquer erro com o nome da etapa e o `jobId`, para que a
  causa raiz seja óbvia no log mesmo com múltiplos jobs rodando em sequência.

### 4. Sem downloads/estado implícito entre módulos

`findBackgroundVideo` devolve uma **URL remota**; é o orquestrador
(`pipeline.ts`) que baixa esse vídeo para um arquivo local
(`downloadBackgroundVideo`) antes de repassar o caminho para `composeVideo`
— porque `composeVideo` (ffmpeg) só opera sobre caminhos locais. Cada módulo
só conhece o que precisa: `backgroundVideoProvider` não sabe que existe
ffmpeg, `composeVideo` não sabe que existe Pexels.

Isso vale para a fonte `pexels`. A fonte alternativa `local`
(`BACKGROUND_SOURCE=local`) não baixa nada em tempo de execução do
pipeline — ela consome um pack de vídeos **já baixado** (`download:background-pack`,
via `yt-dlp`) e **já indexado** por cena (`index:background-pack`), e apenas
**seleciona** os clipes que cobrem a duração da narração
(`selectLocalBackgroundClips`), sem rodar ffmpeg nessa etapa. O pipeline em
si (`pipeline.ts`) só decide *qual* das duas estratégias rodar, com base em
`deps.backgroundSource` — ver [modules.md](./modules.md#srcpipelinets).

Em ambos os casos, quem efetivamente monta o vídeo final é sempre
`composeVideo`, num único comando ffmpeg (ver seção seguinte).

### 5. Legenda com timestamp por palavra, não por frase

O WhisperX é usado especificamente pelo forced alignment (wav2vec2), que dá
timestamp por palavra com boa precisão — não só por frase, como o whisper
"puro" devolveria. Esse dado bruto (`words.json`) alimenta a geração de um
`.ass` com destaque de palavra ativa, formato comum em vídeos curtos
(Reels/TikTok/Shorts). Ver [detalhamento](./captions-highlight.md).

## Diagrama de sequência — `runPipelineForStory`

```
CLI (run-pipeline.ts)          pipeline.ts               providers/módulos
      │                             │                            │
      │  runPipelineForStory(story) │                            │
      ├────────────────────────────►│                            │
      │                             │  mkdir workDir              │
      │                             │──────────────────────────► fs
      │                             │  ttsProvider.synthesize()   │
      │                             ├─────────────────────────────► Piper/ElevenLabs
      │                             │◄───────────────────────────── NarrationResult
      │                             │  generateCaptions()          │
      │                             ├─────────────────────────────► scripts/transcribe.py (WhisperX)
      │                             │                               buildHighlightedAss()
      │                             │◄───────────────────────────── CaptionResult (.srt + .ass)
      │                             │  findBackgroundVideo()       │
      │                             ├─────────────────────────────► Pexels API
      │                             │◄───────────────────────────── { downloadUrl }
      │                             │  downloadBackgroundVideo()   │
      │                             ├─────────────────────────────► fetch + writeFile
      │                             │  composeVideo()               │
      │                             ├─────────────────────────────► ffmpeg (fluent-ffmpeg)
      │                             │◄───────────────────────────── ComposedVideo (final.mp4)
      │                             │  enqueueForReview()           │
      │                             ├─────────────────────────────► storage/pending-review/<jobId>/job.json
      │◄────────────────────────────│  PipelineJob completo         │
```

Qualquer exceção lançada por um provider/módulo é capturada por `runStage`,
reembalada com contexto (`etapa` + `jobId`) e relançada — interrompendo
**apenas aquele job**.

O diagrama acima mostra o caminho `BACKGROUND_SOURCE=pexels` (padrão). Com
`BACKGROUND_SOURCE=local`, os passos `findBackgroundVideo`/
`downloadBackgroundVideo` são substituídos por uma única chamada a
`selectLocalBackgroundClips(indexPath, narrationDurationSeconds)`, que lê o
`index.json` local (sem chamada de rede nem ffmpeg) e apenas escolhe quais
clipes usar.

Em ambos os casos, `composeVideo()` recebe uma descrição do fundo
(`{ kind: "single", videoPath }` para Pexels, ou `{ kind: "clips", packDir, clips }`
para o pack local) e roda **um único comando ffmpeg** que concatena os
clipes quando aplicável, escala/corta para 1080x1920 e embute a legenda —
tudo na mesma recodificação. Antes desta etapa (feature `012-melhorias-recomendadas`),
o fluxo local rodava dois comandos ffmpeg em sequência (montar o fundo, depois
compor); agora roda só um, o que reduz o tempo de geração por vídeo.

## Stack técnica

| Camada | Tecnologia | Onde |
|---|---|---|
| Linguagem/runtime | TypeScript (ESM) rodando via `tsx`, Node.js | todo `src/` |
| TTS | Piper (binário local) ou ElevenLabs (API REST) | `src/modules/tts/` |
| Transcrição/alinhamento | WhisperX (Python, subprocess) | `scripts/transcribe.py` |
| Vídeo de fundo | Pexels Video API (padrão) ou pack local baixado via `yt-dlp` e indexado por cena (ffmpeg scene detection) | `src/modules/video/backgroundVideoProvider.ts`, `backgroundPackIndexer.ts`, `localBackgroundProvider.ts` |
| Composição de vídeo | ffmpeg via `fluent-ffmpeg` | `src/modules/video/composeVideo.ts` |
| Legenda | SubRip (`.srt`) + Advanced SubStation Alpha (`.ass`) | `src/modules/captions/` |
| Persistência | Filesystem (`storage/`), sem banco | `src/modules/review/reviewQueue.ts` |
| Testes | `node:test` (runner nativo do Node) | `src/**/*.test.ts` |

## Por que não há servidor/API/UI

O projeto é deliberadamente uma ferramenta de linha de comando de uso
pessoal/local: uma pessoa roda `yarn generate`, revisa os vídeos abrindo
a pasta `storage/pending-review` num player qualquer, e decide via outro
comando CLI. Não há necessidade (ainda) de multiusuário, autenticação,
concorrência entre execuções ou UI web — introduzir essas camadas agora
seria complexidade sem requisito real por trás. Ver
[roadmap](./roadmap.md#quando-reconsiderar-a-fila-baseada-em-filesystem).
