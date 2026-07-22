# Testes

## Como rodar

```bash
yarn test              # roda a suite uma vez
npx vitest             # roda em watch mode
yarn test:coverage  # roda com relatorio de cobertura (threshold: 100%)
```

Executa via [Vitest](https://vitest.dev/) (`vitest.config.ts` na raiz), que
substituiu o `node:test` usado anteriormente. Os arquivos de teste ficam em
`tests/`, espelhando a estrutura de `src/` arquivo a arquivo (ex.:
`src/modules/tts/quotaTracker.ts` → `tests/modules/tts/quotaTracker.test.ts`).
`src/types.ts` e os arquivos `index.ts` que só reexportam (barris), além de
`src/modules/tts/ttsProvider.ts` (somente a interface `TtsProvider`), não têm
teste correspondente por não conterem lógica executável.

## CI

`.github/workflows/ci.yml` roda automaticamente em todo `push` e
`pull_request`: checkout, `corepack enable`, `yarn install --frozen-lockfile`,
`npx tsc --noEmit` e `yarn test:coverage`. Como a suíte inteira já é mockada
(sem rede nem binários externos), o workflow não depende de nenhum segredo —
qualquer falha de teste ou queda abaixo do threshold de cobertura aparece
como check falho no commit/PR, sem precisar rodar nada localmente antes.
Configurar branch protection para tornar esse check obrigatório antes de
merge é uma ação administrativa feita separadamente no GitHub, fora deste
workflow.

## Cobertura atual

Todo módulo de lógica de `src/` tem teste automatizado correspondente em
`tests/`, com 100% de cobertura de linhas, funções, branches e statements
(threshold configurado em `vitest.config.ts`):

- `config/env` — defaults e valores vindos de `process.env`.
- `modules/reddit/fetchStories` — fluxo OAuth (token cacheado + Bearer),
  filtro por score/tamanho, isolamento de falha por subreddit, e o caso de
  credenciais ausentes (migrado de `fetchStories.missing-credentials.test.ts`).
- `modules/captions/generateCaptions` e `buildHighlightedAss` — resolução do
  interpretador Python (venv/`WHISPERX_PYTHON_BIN`/PATH), montagem do `.ass`
  com destaque por palavra, casos de borda (lista vazia, >4 palavras).
- `modules/tts/piperProvider`, `elevenLabsProvider`, `quotaTracker` — sucesso,
  falha do binário/API, e o bloqueio de cota mensal do ElevenLabs.
- `modules/video/backgroundPackIndexer`, `backgroundVideoProvider`,
  `composeVideo`, `localBackgroundProvider` — detecção/fusão de cenas,
  seleção de vídeo vertical no Pexels, composição via `fluent-ffmpeg`.
- `modules/review/reviewQueue` — as quatro transições de estado da fila.
- `pipeline.ts` — orquestração das etapas, isolamento de falha por etapa
  (`runStage`), e as duas fontes de vídeo de fundo (local/Pexels).
- `scripts/*.ts` — parsing de flags de CLI, encaminhamento para os módulos
  injetados, e os exit codes de erro (`process.exit(1)`).

### Padrão usado nos testes

- Mock de rede via `tests/helpers/mockFetch.ts` (`vi.stubGlobal`), sem
  biblioteca externa de mock de HTTP.
- Diretórios temporários reais (`tests/helpers/tempDir.ts`, via
  `fs.mkdtempSync`) para lógica de filesystem, em vez de mockar `node:fs`
  chamada a chamada.
- `vi.mock` para dependências pesadas por módulo: `fluent-ffmpeg`
  (`composeVideo`, `backgroundPackIndexer`, `localBackgroundProvider`),
  `node:child_process` (`piperProvider`, `download-background-pack.ts`).
- Scripts de CLI (`src/scripts/*.ts`) chamam `main().catch(...)` no
  top-level do módulo — os testes usam `tests/helpers/cli.ts`
  (`importScriptAndWait`/`mockProcessExit`) para importar o script, mockar
  `process.exit` (lançando em vez de encerrar o processo de teste) e
  aguardar os efeitos colaterais via `vi.waitFor`.

## Validação com dependências reais

Como o pipeline depende de binários/serviços externos pesados (ffmpeg,
Piper, WhisperX, Reddit, Pexels, ElevenLabs), a validação "ponta a ponta"
com esses serviços reais não é coberta pela suite automatizada (que roda
100% mockada, sem rede nem binários) — continua sendo feita manualmente
numa máquina com tudo instalado e credenciais reais.

Resumo do que já foi confirmado dessa forma:

- Setup (ffmpeg, Piper, WhisperX instalados e importáveis) ✓
- Síntese real com Piper (2130 caracteres → áudio pt-BR válido) ✓
- Isolamento de falha por subreddit/etapa (com mocks) ✓
- Ciclo completo da fila de revisão (pending → approved → published / discarded) ✓
- Bloqueio de cota do ElevenLabs antes de chamar a API (com `fetch` interceptado) ✓
- **Pipeline completo ponta a ponta** (`yarn generate --input <pasta>`, fonte local):
  narração real com Piper (`narration.wav`), transcrição real via WhisperX,
  composição em um único comando ffmpeg (`storage/pending-review/<jobId>/final.mp4`,
  1080x1920, h264), com legenda de destaque por palavra queimada no vídeo
  (confirmado por inspeção visual de frame extraído) — validado na feature
  `012-melhorias-recomendadas` ✓
- Rejeição de `jobId` malicioso via `yarn discard`/`yarn run publish` (path
  traversal e barra), antes de qualquer `rename` no filesystem ✓
- Rejeição de `ELEVENLABS_MONTHLY_CHAR_LIMIT` inválido no construtor do
  `QuotaTracker`, antes de qualquer chamada ao ElevenLabs (`yarn regenerate:elevenlabs`) ✓
- Rejeição de história manual sem campo obrigatório (`body`), antes da etapa de TTS ✓

⚠️ **`yarn publish` (sem `run`) não funciona** — colide com o comando
built-in `publish` do Yarn (equivalente a `npm publish`) e é silenciosamente
interceptado por ele em vez de rodar `src/scripts/publish.ts`. Use sempre
`yarn run publish <jobId>` (confirmado durante a validação manual desta
feature; os demais scripts — `generate`, `discard`, `regenerate:elevenlabs`,
`download:background-pack`, `index:background-pack`, `test` — não colidem
com nomes reservados do Yarn e funcionam com `yarn <script>` normalmente).

E o que ainda depende de confirmação numa máquina real:

- Busca real no Reddit (bloqueada por 403 na máquina de desenvolvimento — ver [environment.md](./environment.md#nota-sobre-o-reddit-sem---input))
- Síntese real com ElevenLabs (credenciais reais)
- Fluxo completo de `regenerate:elevenlabs` com chamada real à API (validado até a checagem de cota; a chamada HTTP em si depende de crédito real na conta)

A legenda com highlight de palavra ([captions-highlight.md](./captions-highlight.md))
foi validada nesse mesmo espírito: gerando um job real e extraindo um frame
com `ffmpeg -ss ... -frames:v 1` para inspeção visual, em vez de comparação
automatizada de imagem (não há framework de comparação de imagem no
projeto) — o teste automatizado de `buildHighlightedAss` cobre a
estrutura/formatação do `.ass` gerado, não a renderização visual do
destaque.
