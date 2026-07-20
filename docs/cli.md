# CLI — referência de comandos

Todos os comandos são `npm run <script>`, definidos em `package.json` e
implementados em `src/scripts/`. Variáveis de ambiente necessárias em
[environment.md](./environment.md).

## `npm run generate [-- --input <arquivo.json>]`

Implementação: `src/scripts/run-pipeline.ts`.

Sem `--input`: chama `fetchStories({ subreddits: ["AskHistorians"], minScore: 500, minBodyLength: 800, limit: 5 })`,
roda `runPipelineForStory` com `PiperProvider` para cada história encontrada,
e enfileira cada uma em `storage/pending-review`.

Com `--input <arquivo.json>`: pula o Reddit inteiramente. Lê um array de
[`RedditStory`](./data-model.md#redditstory) do arquivo indicado
(`loadStoriesFromFile`) e roda o mesmo pipeline sobre elas. Útil para:

- testar o pipeline (TTS → legenda → vídeo) sem depender de credenciais OAuth do Reddit;
- gerar vídeo a partir de conteúdo próprio/curado à mão.

Formato esperado do arquivo (ver exemplo em
[`storage/manual-stories/exemplo.json`](../storage/manual-stories/exemplo.json)):

```json
[
  {
    "id": "id-unico",
    "subreddit": "manual",
    "title": "Título da história",
    "body": "Texto completo que vira a narração...",
    "url": "https://qualquer-url.com",
    "score": 0
  }
]
```

Cada item do array vira um `PipelineJob` independente. `--input` sem valor
depois (`npm run generate -- --input`) aborta com mensagem de uso
(`process.exit(1)`), sem tentar interpretar o próximo argumento como outra
coisa.

Variáveis obrigatórias: `PIPER_MODEL_PATH`, `PEXELS_API_KEY` (+ `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET` se **não** usar `--input`).

Saída no terminal: um `Job pronto para revisao: <jobId>` por história
processada com sucesso.

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

## `npm run regenerate:elevenlabs -- <jobId>`

Implementação: `src/scripts/regenerate-with-elevenlabs.ts`.

Caminho 2 da revisão manual: "aprovado, mas a voz do Piper ficou fraca".

1. Lê o job pendente (`readPendingJob(jobId)`) — **não** precisa mais estar em `pending-review` ao final; o comando só lê, não move nem apaga o original.
2. Cria um `QuotaTracker` (`storage/elevenlabs-quota.json`, limite de `ELEVENLABS_MONTHLY_CHAR_LIMIT`) e um `ElevenLabsProvider`.
3. Roda `runPipelineForStory(previousJob.story, { ttsProvider: elevenLabs, ... })` — o **mesmo** `story`, mas narração/legenda/vídeo recalculados do zero.
4. O resultado é um job **novo** (novo `jobId`, baseado em `Date.now()` no momento da regeneração), enfileirado em `pending-review` ao lado do original.

Variáveis obrigatórias: `PEXELS_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`.

Sem argumento: aborta com `Uso: npm run regenerate:elevenlabs -- <jobId>`.

⚠️ A query do vídeo de fundo (`backgroundQuery`) é reescrita como a mesma
string fixa (`"pessoa organizando"`) usada no fluxo padrão, em vez de
reaproveitar a do job original — comportamento atual, marcado como `TODO`
no próprio código.

## `npm test`

Roda `tsx --test src/**/*.test.ts` (runner nativo `node:test`, sem
framework externo). Ver [testing.md](./testing.md).
