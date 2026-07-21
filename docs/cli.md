# CLI — referência de comandos

Todos os comandos são `npm run <script>`, definidos em `package.json` e
implementados em `src/scripts/`. Variáveis de ambiente necessárias em
[environment.md](./environment.md).

## `npm run generate [-- --input <pasta>] [--story <id-ou-arquivo>] [--background-query <termo>] [--background-source <pexels|local>]`

Implementação: `src/scripts/run-pipeline.ts`.

Sem `--input`: chama `fetchStories({ subreddits: ["AskHistorians"], minScore: 500, minBodyLength: 800, limit: 5 })`,
roda `runPipelineForStory` com `PiperProvider` para cada história encontrada,
e enfileira cada uma em `storage/pending-review`.

Com `--input <pasta>`: pula o Reddit inteiramente. Lê **um arquivo `.json`
por história** da pasta indicada (`loadStoriesFromDirectory`, ordenado por
nome de arquivo), cada um contendo um único objeto
[`RedditStory`](./data-model.md#redditstory) (não um array), e roda o mesmo
pipeline sobre elas. Útil para:

- testar o pipeline (TTS → legenda → vídeo) sem depender de credenciais OAuth do Reddit;
- gerar vídeo a partir de conteúdo próprio/curado à mão.

Formato esperado de cada arquivo (ex: `storage/manual-stories/1v2ka4z.json`):

```json
{
  "id": "1v2ka4z",
  "subreddit": "RelatosDoReddit",
  "title": "Título da história",
  "body": "Texto completo que vira a narração...",
  "url": "https://www.reddit.com/r/RelatosDoReddit/comments/1v2ka4z/...",
  "score": 0
}
```

Com `--story <id-ou-arquivo>`: filtra, dentro da pasta de `--input`, só a
história cujo campo `id` **ou** nome do arquivo (com ou sem `.json`) bate
com o valor passado. Sem essa flag, todas as histórias da pasta são
processadas em sequência. Se nenhuma história corresponder, aborta com
erro explícito.

Cada arquivo vira um `PipelineJob` independente. `--input`/`--story`/
`--background-query`/`--background-source` sem valor depois (ex:
`npm run generate -- --input`) abortam com mensagem de uso
(`process.exit(1)`), sem tentar interpretar o próximo argumento como outra
coisa.

### Fonte do vídeo de fundo (`--background-source`)

- `pexels` (padrão): busca no Pexels com o termo de `--background-query`
  (ou env `BACKGROUND_QUERY`). Ver [`findBackgroundVideo`](./modules.md#srcmodulesvideobackgroundvideoproviderts).
  **A mesma query é usada para todas as histórias do lote** — como a busca
  é determinística (sempre pega o primeiro resultado), rodar `--input`
  com várias histórias de uma vez faz todas saírem com o **mesmo** vídeo
  de fundo.
- `local`: usa um pack de vídeos próprio, já baixado (`download:background-pack`)
  e indexado (`index:background-pack`). Cada história sorteia
  independentemente uma combinação de clipes do pack até bater a duração
  da narração — ver [`buildLocalBackgroundVideo`](./modules.md#srcmodulesvideolocalbackgroundproviderts).

Variáveis obrigatórias: `PIPER_MODEL_PATH`, `PEXELS_API_KEY` (só com
`--background-source pexels`, o padrão) (+ `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET`
se **não** usar `--input`).

Saída no terminal: um `Job pronto para revisao: <jobId>` por história
processada com sucesso.

## `npm run download:background-pack -- [--url <playlist>] [--output <pasta>] [--limit <n>]`

Implementação: `src/scripts/download-background-pack.ts`.

Baixa (via `yt-dlp`, precisa estar instalado à parte) uma playlist do
YouTube com um pack de vídeos de fundo próprio — pensado para playlists de
vídeos longos (compilados de trechos curtos, ex: "oddly satisfying"), que
depois são cortados em cena pelo `index:background-pack`.

- `--url` (ou env `BACKGROUND_PACK_PLAYLIST_URL`): URL da playlist.
- `--output` (ou env `BACKGROUND_PACK_DIR`): pasta de saída (padrão `storage/background-pack`).
- `--limit <n>`: baixa só os primeiros `n` vídeos da playlist (via `--playlist-items 1-n` do `yt-dlp`) — útil para testar antes de baixar tudo.

Se `yt-dlp` não estiver no `PATH`, aborta com mensagem indicando como
instalar (`pipx install yt-dlp`).

## `npm run index:background-pack -- [--dir <pasta>] [--output <arquivo.json>] [--threshold <0-1>] [--min-clip-seconds <segundos>]`

Implementação: `src/scripts/index-background-pack.ts`.

Roda detecção de corte de cena (filtro `select='gt(scene,threshold)'` do
ffmpeg) em cada vídeo da pasta do pack, e grava um `index.json` com os
intervalos (`{ startSeconds, endSeconds }`) de cada trecho curto dentro de
cada vídeo — ver [`indexBackgroundPack`](./modules.md#srcmodulesvideobackgroundpackindexerts).
Esse índice é o que permite ao provider local (`--background-source local`)
sortear clipes **inteiros**, sem cortar no meio de uma cena.

- `--dir` (ou env `BACKGROUND_PACK_DIR`): pasta com os vídeos do pack.
- `--output`: caminho do JSON de saída (padrão `<dir>/index.json`).
- `--threshold`: sensibilidade da detecção (padrão `0.3`; menor = mais cortes detectados).
- `--min-clip-seconds`: funde clipes menores que isso com o vizinho (padrão `1.5`).

## `npm run publish -- <jobId>`

Implementação: `src/scripts/publish.ts`.

Caminho 1 da revisão manual: "o resultado (normalmente Piper) ficou
satisfatório, pode publicar". Move o job:
`pending-review/<jobId>` → `approved/<jobId>` → `published/<jobId>`
(duas chamadas em sequência, `moveToApproved` + `moveToPublished`).

A publicação de fato (upload para Instagram/TikTok/YouTube) **não está
implementada** — o comando só termina com um `TODO: acionar upload via API
da plataforma desejada` no log. Ver
[roadmap.md](./roadmap.md#publicação-automática-nas-plataformas).

Sem argumento: aborta com `Uso: npm run publish -- <jobId>`.

## `npm run discard -- <jobId>`

Implementação: `src/scripts/discard.ts`.

Caminho 3 da revisão manual: conteúdo/história não presta. Move o job de
`pending-review/<jobId>` para `discarded/<jobId>` (`moveToDiscarded`).

Sem argumento: aborta com `Uso: npm run discard -- <jobId>`.

## `npm run regenerate:elevenlabs -- <jobId> [--background-query <termo>] [--background-source <pexels|local>]`

Implementação: `src/scripts/regenerate-with-elevenlabs.ts`.

Caminho 2 da revisão manual: "aprovado, mas a voz do Piper ficou fraca".

1. Lê o job pendente (`readPendingJob(jobId)`) — **não** precisa mais estar em `pending-review` ao final; o comando só lê, não move nem apaga o original.
2. Cria um `QuotaTracker` (`storage/elevenlabs-quota.json`, limite de `ELEVENLABS_MONTHLY_CHAR_LIMIT`) e um `ElevenLabsProvider`.
3. Roda `runPipelineForStory(previousJob.story, { ttsProvider: elevenLabs, ... })` — o **mesmo** `story`, mas narração/legenda/vídeo recalculados do zero.
4. O resultado é um job **novo** (novo `jobId`, baseado em `Date.now()` no momento da regeneração), enfileirado em `pending-review` ao lado do original.

Variáveis obrigatórias: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (+ `PEXELS_API_KEY`
se `--background-source` for `pexels`, o padrão).

Sem argumento: aborta com `Uso: npm run regenerate:elevenlabs -- <jobId>`.

⚠️ A query/fonte do vídeo de fundo **não** é reaproveitada do job original —
usa o mesmo padrão (`BACKGROUND_QUERY`/`BACKGROUND_SOURCE`, ou as flags
passadas nesta chamada) que `generate` usaria, não o que foi usado quando o
job original foi criado.

## `npm test`

Roda `tsx --test src/**/*.test.ts` (runner nativo `node:test`, sem
framework externo). Ver [testing.md](./testing.md).
