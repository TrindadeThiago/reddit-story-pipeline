# Referência de módulos

Um arquivo por módulo, com responsabilidade, API pública e comportamento
relevante (inclusive edge cases). Para o "porquê" das decisões de design, ver
[architecture.md](./architecture.md).

## `src/types.ts`

Tipos compartilhados por todo o pipeline. Ver [data-model.md](./data-model.md)
para o detalhamento de cada um.

## `src/pipeline.ts`

### `runPipelineForStory(story: RedditStory, deps: RunPipelineDeps): Promise<PipelineJob>`

Orquestrador central — roda as cinco etapas do pipeline para **uma**
história e devolve o `PipelineJob` completo. Usado tanto pelo fluxo normal
(`run-pipeline.ts`, com `PiperProvider`) quanto pela regeneração
(`regenerate-with-elevenlabs.ts`, com `ElevenLabsProvider`).

```ts
type BackgroundSourceDeps =
  | {
      backgroundSource: "local";
      backgroundPackDir: string;
      backgroundPackIndexPath: string;
    }
  | {
      backgroundSource: "pexels";
      pexelsApiKey: string;
      pexelsApiUrl: string;
      backgroundQuery: string; // TODO: hoje é fixa, não deriva do conteúdo da história
    };

type RunPipelineDeps = {
  ttsProvider: TtsProvider;
  whisperModelSize: string;
} & BackgroundSourceDeps;
```

`BackgroundSourceDeps` é uma union discriminada por `backgroundSource` —
o TypeScript exige os campos certos conforme o valor escolhido (não dá pra
passar `backgroundQuery` com `backgroundSource: "local"`, por exemplo).

Passos, em ordem:

1. `assertSafeId(story.id, "story.id")` — recusa `id`s fora da whitelist
   `^[A-Za-z0-9_-]+$` antes de qualquer I/O (fecha path traversal e injeção
   no filtergraph do ffmpeg).
2. `mkdir` de `storage/pending-review/<jobId>/` (`jobId = "${story.id}-${Date.now()}"`).
3. `ttsProvider.synthesize(story.body, .../narration.mp3)` → `job.narration`.
4. `generateCaptions(narration.audioFilePath, .../captions.srt, whisperModelSize)` → `job.captions` (inclui geração do `.ass`, ver [captions-highlight.md](./captions-highlight.md)).
5. Vídeo de fundo, conforme `deps.backgroundSource` — resulta em um `BackgroundInput` passado para `composeVideo`:
   - `"pexels"`: `findBackgroundVideo(backgroundQuery, pexelsApiKey, pexelsApiUrl)` seguido de `downloadBackgroundVideo` para `.../background.mp4` local → `{ kind: "single", videoPath }`.
   - `"local"`: `selectLocalBackgroundClips(backgroundPackIndexPath, narrationDurationSeconds)`, onde `narrationDurationSeconds` vem do `endSeconds` da última palavra de `job.captions.words` (a legenda já foi gerada no passo anterior) → `{ kind: "clips", packDir: backgroundPackDir, clips }`. Só seleciona os clipes; não roda ffmpeg.
6. `composeVideo({ narrationAudioPath, background, captionsAssPath, outputPath })` → `job.video`. Roda um único comando ffmpeg (concat dos clipes quando aplicável + escala/corte + legenda), ver detalhes na seção do próprio módulo.
7. `enqueueForReview(job)` — grava `job.json` em `storage/pending-review/<jobId>/`.

Cada passo é envolvido por `runStage(stage, jobId, fn)`, que recontextualiza
qualquer exceção como:

```
runPipelineForStory: falha na etapa "<stage>" (job <jobId>): <mensagem original>
```

preservando a causa original via `Error.cause`.

### `downloadBackgroundVideo(downloadUrl, destPath)` (interna)

Baixa a URL remota devolvida por `findBackgroundVideo` para um arquivo
local via `fetch` + `writeFile`. Existe porque `composeVideo` (ffmpeg) só
aceita caminhos locais como input.

## `src/modules/reddit/fetchStories.ts`

### `fetchStories(options: FetchStoriesOptions): Promise<RedditStory[]>`

```ts
interface FetchStoriesOptions {
  subreddits: string[];
  minScore: number;
  minBodyLength: number;
  limit: number;
}
```

Busca posts em `oauth.reddit.com/r/<subreddit>/top?t=week&limit=<limit>`,
autenticado via OAuth `client_credentials`. Filtra os resultados por
`post.score >= minScore` e `post.selftext.length >= minBodyLength`.

**Por que OAuth e não o endpoint JSON público:** `reddit.com/r/x/top.json`
sem autenticação retorna 403 para tráfego que pareça automatizado
(headless HTTP client, sem sessão de browser) — não é específico de IP de
datacenter, é o comportamento observado mesmo fora de ambientes cloud.

**Cache de token:** `getAccessToken()` (interna) mantém o token em memória
(`tokenCache`) e só renova quando expira (com margem de 60s). O cache é
por processo — cada execução do CLI começa sem token.

**Isolamento de falha:** se a busca em um subreddit falhar (rede, rate
limit, subreddit inexistente), o erro é logado via `console.error` e o loop
segue para o próximo subreddit — a função nunca lança nesse caso, só
devolve uma lista possivelmente menor. Já uma falha ao obter o
`access_token` (ex: credenciais ausentes/inválidas) aborta a função inteira
e devolve `[]`, já que sem token nenhuma busca seria possível.

## `src/modules/tts/ttsProvider.ts`

```ts
interface TtsProvider {
  readonly name: "piper" | "elevenlabs";
  synthesize(text: string, outputPath: string): Promise<NarrationResult>;
}
```

Contrato único. Ver [architecture.md — TTS plugável](./architecture.md#1-tts-plugável-ttsprovider).

## `src/modules/tts/piperProvider.ts`

### `class PiperProvider implements TtsProvider`

`synthesize` roda `spawn("piper", ["--model", modelPath, "--length_scale", lengthScale, "--output_file", outputPath])`,
escreve o texto no `stdin` do processo e resolve quando o processo fecha com
código 0 (rejeita com o conteúdo de `stderr` caso contrário). `charactersUsed`
no resultado é só `text.length` — não conta para nenhuma cota, mantido por
consistência de métricas com o provider ElevenLabs.

`lengthScale` (segundo argumento do construtor, tipicamente `ENV.PIPER_LENGTH_SCALE`)
controla a velocidade da fala: valores menores que `1` (padrão do próprio
Piper) aceleram a narração, maiores desaceleram. Ver
[environment.md](./environment.md) para o valor padrão do projeto.

## `src/modules/tts/quotaTracker.ts`

### `class QuotaTracker`

Controla quantos caracteres já foram sintetizados no mês corrente, para o
`ElevenLabsProvider` nunca estourar o free tier sem perceber.

- `assertHasBudget(additionalChars)` — lança erro se `charactersUsed + additionalChars > monthlyLimit`. Chamado **antes** de qualquer request à API.
- `recordUsage(chars)` — soma ao total do mês. Chamado **depois** de uma síntese bem-sucedida.

Estado persistido como JSON (`{ yearMonth, charactersUsed }`) em
`storage/elevenlabs-quota.json` (caminho passado no construtor). Se o mês
mudou desde o último estado salvo (ou o arquivo não existe/é inválido), o
contador reseta para `0` transparentemente.

## `src/modules/tts/elevenLabsProvider.ts`

### `class ElevenLabsProvider implements TtsProvider`

`synthesize`:

1. `quota.assertHasBudget(text.length)` — pode lançar antes de qualquer chamada de rede.
2. `POST <apiUrl>/text-to-speech/<voiceId>` com `model_id: modelId` (padrão `eleven_flash_v2_5`, ver `ENV.ELEVENLABS_MODEL_ID`) e `voice_settings.speed: 1.2` (narração ~20% mais rápida que o padrão da voz).
3. Grava o áudio retornado em `outputPath`.
4. `quota.recordUsage(text.length)`.

`apiUrl` e `modelId` são parâmetros do construtor (`ENV.ELEVENLABS_API_URL`/
`ENV.ELEVENLABS_MODEL_ID` nos scripts), não hardcoded — permite apontar
para outra base URL ou trocar de modelo sem mexer no código.

Só deve ser acionado no caminho 2 da revisão (`regenerate:elevenlabs`) —
nunca no fluxo padrão, que usa Piper.

## `src/modules/captions/generateCaptions.ts`

### `generateCaptions(audioFilePath, outputSrtPath, modelSize): Promise<CaptionResult>`

1. `execFile(resolvePythonBin(), ["scripts/transcribe.py", "--audio", ..., "--model", modelSize, "--out-srt", outputSrtPath, "--out-json", `${outputSrtPath}.words.json`])`. `resolvePythonBin()` usa `WHISPERX_PYTHON_BIN` se definida, senão `.venv-whisperx/bin/python3` se existir, senão `python3` do PATH — ver [environment.md](./environment.md#nota-sobre-qual-python3-é-usado).
2. Lê `${outputSrtPath}.words.json` (array de `CaptionWord`).
3. `buildHighlightedAss(words, outputSrtPath.replace(/\.srt$/, ".ass"))`.
4. Devolve `{ words, srtFilePath: outputSrtPath, assFilePath }`.

O `.srt` é gerado mas não é o que acaba no vídeo final — ver
[captions-highlight.md](./captions-highlight.md) para por quê.

## `src/modules/captions/buildHighlightedAss.ts`

### `buildHighlightedAss(words: CaptionWord[], outputPath: string): Promise<void>`

Gera um arquivo `.ass` com uma linha `Dialogue` por palavra falada, palavra
ativa destacada. Documentado em detalhe em
[captions-highlight.md](./captions-highlight.md).

## `scripts/transcribe.py`

Script Python auxiliar, chamado via subprocess por `generateCaptions`. Não
faz parte do grafo de módulos TypeScript — é a ponte com o WhisperX.

```
python3 scripts/transcribe.py --audio <mp3> --model <tiny|base|small|...> \
  --out-srt <caminho.srt> --out-json <caminho.words.json>
```

1. Carrega o modelo WhisperX (`device="cpu"`, `compute_type="int8"` — trocar
   para `"float16"` se rodar em GPU) e transcreve o áudio (`language="pt"`
   fixo).
2. Roda forced alignment (`whisperx.align`, via modelo wav2vec2) sobre os
   segmentos transcritos — é essa etapa que dá o timestamp por palavra
   preciso.
3. Escreve o `.srt` (um bloco por segmento, timestamp `HH:MM:SS,mmm`) e o
   `.words.json` (`{ word, startSeconds, endSeconds }[]`).
4. Palavras sem `start`/`end` no resultado do alignment (comum em palavras
   muito curtas ou ruído) são descartadas silenciosamente — não quebram a
   legenda, só ficam de fora do highlight.

**Custo de recursos:** roda inteiramente local, com todo o stack
whisper + VAD + wav2vec2 em `torch`. Em máquinas com pouca RAM (< 4GB),
pode ser morto pelo OOM killer — usar `--model tiny` nesse caso. Ver
[testing.md](./testing.md#checklist-de-validação-com-dependências-reais).

## `src/modules/video/backgroundVideoProvider.ts`

### `findBackgroundVideo(query, pexelsApiKey, apiUrl): Promise<{ downloadUrl, durationSeconds }>`

`GET <apiUrl>/videos/search?query=<query>&orientation=portrait&per_page=5&min_duration=60`.
Do primeiro vídeo retornado (`videos[0]` — busca é determinística: mesma
query sempre devolve o mesmo vídeo), filtra `video_files` para só os
verticais (`width < height`) e ordena por `height` decrescente, devolvendo
o link do de maior resolução. Lança erro explícito se não houver vídeos
(`Nenhum video encontrado para query: <query>`) ou se nenhum arquivo do
vídeo encontrado for vertical.

⚠️ Como só o primeiro resultado é usado e a query é fixa por execução,
rodar `generate --input <pasta>` (várias histórias de uma vez) com essa
fonte faz todas saírem com o **mesmo** vídeo de fundo. Para variedade real
entre histórias, usar `BACKGROUND_SOURCE=local` (ver
[`localBackgroundProvider.ts`](#srcmodulesvideolocalbackgroundproviderts)).

## `src/modules/video/backgroundPackIndexer.ts`

### `indexBackgroundPack(dirPath, options?): Promise<BackgroundPackIndex>`

Roda em cada vídeo (`.mp4`/`.mov`/`.mkv`/`.webm`) da pasta indicada
(tipicamente `storage/background-pack/`, populada por `download:background-pack`):

1. `ffmpeg.ffprobe` para obter a duração total do vídeo.
2. Detecção de corte de cena via filtro `select='gt(scene,threshold)',showinfo`
   do ffmpeg — cada linha de `stderr` com `pts_time:` marca um ponto de corte.
3. `buildClips` converte os pontos de corte em intervalos `{ startSeconds, endSeconds }`,
   fundindo (merge) qualquer clipe resultante mais curto que `minClipSeconds`
   com o clipe seguinte, para não gerar trechos curtos demais para servir de
   fundo.

`options.sceneThreshold` (padrão `0.3`) e `options.minClipSeconds` (padrão
`1.5`) — expostos como `--threshold`/`--min-clip-seconds` em
`index-background-pack.ts`. Devolve `{ generatedAt, files: BackgroundPackFileIndex[] }`
(ver [data-model.md](./data-model.md#backgroundclip-backgroundpackfileindex-backgroundpackindex)).

## `src/modules/video/localBackgroundProvider.ts`

### `pickClips(index: BackgroundPackIndex, targetDurationSeconds): FlatClip[]`

Escolhe (sem tocar em ffmpeg) os clipes locais que cobrem a duração alvo:

1. Lê e achata (`flattenClips`) todos os clipes de todos os vídeos do
   índice numa lista única.
2. Embaralha (`shuffle`, `Math.random()`) essa lista e acumula clipes até
   somar `targetDurationSeconds + 2s` (margem contra arredondamento de
   encode). Se o pack inteiro não bastar, reembaralha e repete clipes até
   atingir a duração — nunca falha por "pack curto demais", só reutiliza
   trechos.
3. Lança erro se o índice não tiver nenhum clipe, ou se todos os clipes
   indexados tiverem duração zero (evita loop infinito num pack degenerado).

### `selectLocalBackgroundClips(indexPath, targetDurationSeconds): Promise<FlatClip[]>`

Lê `index.json` do disco e delega a `pickClips`. Não monta nenhum vídeo —
quem faz isso é sempre `composeVideo` (ver abaixo), que recebe a lista de
clipes e o `packDir` para montar um único comando ffmpeg.

Cada chamada re-sorteia independentemente — histórias diferentes do mesmo
lote (`generate --input <pasta>`) tipicamente recebem combinações de
clipes diferentes, mesmo vindo do mesmo pack.

## `src/modules/video/composeVideo.ts`

### `composeVideo(options: ComposeOptions): Promise<ComposedVideo>`

```ts
type BackgroundInput =
  | { kind: "single"; videoPath: string }
  | { kind: "clips"; packDir: string; clips: FlatClip[] };

interface ComposeOptions {
  narrationAudioPath: string;
  background: BackgroundInput;
  captionsAssPath: string;
  outputPath: string;
}
```

Roda **um único comando ffmpeg**, qualquer que seja a origem do fundo —
substituindo o fluxo anterior de duas recodificações (montar o fundo local,
depois compor) por uma só:

1. Valida que todos os arquivos de entrada existem (`existsSync`) — narração,
   legenda, e o vídeo único (`kind: "single"`) ou cada arquivo de clipe
   (`kind: "clips"`); rejeita com erro nomeando o campo e o caminho que
   falta, sem sequer chamar o ffmpeg. Rejeita também se `kind: "clips"` vier
   com `clips: []`.
2. Registra os inputs conforme o tipo de fundo:
   - `"single"`: um input com `-stream_loop -1` (loop infinito, cortado
     depois pelo `-shortest`).
   - `"clips"`: um input por clipe (`-ss`/`-t` para recortar cada trecho do
     arquivo de origem).
   - Por último, sempre um input com o áudio da narração.
3. Monta o `complexFilter`:
   - `"clips"`: `setpts=PTS-STARTPTS` em cada clipe + `concat=n=<N>:v=1:a=0`
     produzindo `[outv]` (filtro `concat`, não o demuxer — os clipes podem
     vir de arquivos-fonte com codecs/resoluções diferentes).
   - Em seguida (ambos os casos): `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`
     seguido de `subtitles=<captionsAssPath>` para queimar a legenda.
4. Output: mapeia o vídeo filtrado + o áudio da narração, `-shortest` (corta
   no fim do áudio), `libx264`/`aac`.
5. Resolve com `{ videoFilePath: outputPath }` no evento `end` do ffmpeg;
   rejeita no evento `error`.

## `src/modules/review/reviewQueue.ts`

Fila de revisão como pastas no filesystem. Ver
[architecture.md — fila de revisão](./architecture.md#2-fila-de-revisão--filesystem-não-banco).

| Função | Efeito |
|---|---|
| `enqueueForReview(job)` | cria `storage/pending-review/<jobId>/job.json` |
| `readPendingJob(jobId)` | lê e faz parse de `storage/pending-review/<jobId>/job.json` |
| `moveToApproved(jobId)` | `rename` `pending-review/<jobId>` → `approved/<jobId>` |
| `moveToPublished(jobId)` | `rename` `approved/<jobId>` → `published/<jobId>` |
| `moveToDiscarded(jobId)` | `rename` `pending-review/<jobId>` → `discarded/<jobId>` |

`publish.ts` chama `moveToApproved` seguido de `moveToPublished` em
sequência (o estado `approved` é só um passo intermediário, não pausável
hoje).

## `src/scripts/*.ts`

Ver [cli.md](./cli.md) para a referência de uso de cada um
(`run-pipeline.ts`, `publish.ts`, `discard.ts`,
`regenerate-with-elevenlabs.ts`, `download-background-pack.ts`,
`index-background-pack.ts`).
