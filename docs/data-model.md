# Modelo de dados

Todos os tipos vivem em [`src/types.ts`](../src/types.ts) e são consumidos
por múltiplos módulos — este documento é a referência de forma + significado
de cada campo.

## `RedditStory`

```ts
interface RedditStory {
  id: string;
  subreddit: string;
  title: string;
  body: string;
  url: string;
  score: number;
}
```

Formato de entrada do pipeline, seja vindo do Reddit real
(`fetchStories`) ou de uma pasta `--input` manual, um arquivo `.json` por
história (ver [cli.md](./cli.md#npm-run-generate----input-pasta---story-id-ou-arquivo---background-query-termo---background-source-pexelslocal)).
`body` é o texto que vira a narração (`ttsProvider.synthesize(story.body, ...)`)
— sem nenhum processamento/resumo antes.

## `NarrationResult`

```ts
interface NarrationResult {
  provider: "piper" | "elevenlabs";
  audioFilePath: string;
  charactersUsed: number;
}
```

Saída de `TtsProvider.synthesize`. `charactersUsed` é informativo para
ambos os providers, mas só é usado para controle real de cota no caminho
ElevenLabs (`QuotaTracker`).

## `CaptionWord`

```ts
interface CaptionWord {
  word: string;
  startSeconds: number;
  endSeconds: number;
}
```

Uma entrada por palavra transcrita, com timestamp obtido via forced
alignment do WhisperX. É o dado bruto que alimenta tanto o `.srt` (agrupado
por segmento) quanto o `.ass` com highlight (uma palavra por vez).

## `CaptionResult`

```ts
interface CaptionResult {
  words: CaptionWord[];
  srtFilePath: string;
  assFilePath: string;
}
```

Saída de `generateCaptions`. `assFilePath` é o que efetivamente é queimado
no vídeo por `composeVideo`; `srtFilePath` fica disponível no job (ex: para
inspeção manual do texto transcrito) mas não é usado na composição.

## `ComposedVideo`

```ts
interface ComposedVideo {
  videoFilePath: string; // final.mp4, 1080x1920
}
```

## `BackgroundClip`, `BackgroundPackFileIndex`, `BackgroundPackIndex`

```ts
interface BackgroundClip {
  startSeconds: number;
  endSeconds: number;
}

interface BackgroundPackFileIndex {
  fileName: string;
  durationSeconds: number;
  clips: BackgroundClip[];
}

interface BackgroundPackIndex {
  generatedAt: string;
  files: BackgroundPackFileIndex[];
}
```

Formato do `index.json` gerado por `index:background-pack`
(`indexBackgroundPack`, ver [modules.md](./modules.md#srcmodulesvideobackgroundpackindexerts)).
Cada `BackgroundClip` é um trecho contínuo (sem corte de cena no meio)
dentro de um dos vídeos do pack local; é a unidade que o provider local
(`selectLocalBackgroundClips`/`pickClips`) sorteia, e que `composeVideo`
concatena para montar o vídeo de fundo de uma história, quando
`BACKGROUND_SOURCE=local`.

## `ReviewDecision`

```ts
type ReviewDecision = "publish" | "regenerate_elevenlabs" | "discard";
```

Tipo conceitual dos três caminhos de revisão manual — não há um campo
`decision` persistido em `PipelineJob`; a decisão é implícita em qual
comando CLI foi rodado e para qual diretório o job foi movido.

## `PipelineJob`

```ts
interface PipelineJob {
  jobId: string;        // "<story.id>-<Date.now()>"
  story: RedditStory;
  narration?: NarrationResult;
  captions?: CaptionResult;
  video?: ComposedVideo;
}
```

Objeto central do pipeline — serializado como `job.json` dentro de
`storage/<estado>/<jobId>/`. Os campos opcionais (`narration`, `captions`,
`video`) só existem preenchidos se aquela etapa já rodou com sucesso; como
`runPipelineForStory` lança no primeiro erro de etapa, na prática um
`job.json` só chega a ser escrito (por `enqueueForReview`) quando **todos**
os campos já estão preenchidos — não existe hoje um job parcialmente
persistido em disco.

`jobId` combina o `id` da história com `Date.now()` para permitir múltiplos
jobs da mesma história (ex: o job original e o gerado por
`regenerate:elevenlabs` coexistem com IDs diferentes).

### Exemplo de `job.json`

```json
{
  "jobId": "manual-0001-1784577169735",
  "story": {
    "id": "manual-0001",
    "subreddit": "manual",
    "title": "Eu troquei de emprego depois de 10 anos...",
    "body": "Passei uma decada inteira...",
    "url": "https://example.com/manual/manual-0001",
    "score": 1500
  },
  "narration": {
    "provider": "piper",
    "audioFilePath": "storage/pending-review/manual-0001-1784577169735/narration.mp3",
    "charactersUsed": 1450
  },
  "captions": {
    "words": [
      { "word": "passei", "startSeconds": 0.031, "endSeconds": 0.311 }
    ],
    "srtFilePath": "storage/pending-review/manual-0001-1784577169735/captions.srt",
    "assFilePath": "storage/pending-review/manual-0001-1784577169735/captions.ass"
  },
  "video": {
    "videoFilePath": "storage/pending-review/manual-0001-1784577169735/final.mp4"
  }
}
```

## Ciclo de vida de um job (estados no filesystem)

```
                 enqueueForReview
                        │
                        ▼
              storage/pending-review/<jobId>/
                 │                    │
     moveToApproved                moveToDiscarded
       + moveToPublished                 │
                 │                       ▼
                 ▼             storage/discarded/<jobId>/
      storage/published/<jobId>/
```

`regenerate:elevenlabs` não move o job original — ele **lê**
(`readPendingJob`) o job pendente e cria um `jobId` totalmente novo, cujo
`story` é copiado do original mas `narration`/`captions`/`video` são
recalculados do zero com `ElevenLabsProvider`. O job original permanece em
`pending-review` até uma decisão explícita sobre ele.
