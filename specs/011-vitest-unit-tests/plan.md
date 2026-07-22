# Implementation Plan: Testes Unitarios com Vitest

**Branch**: `011-vitest-unit-tests` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-vitest-unit-tests/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Adotar o Vitest como executor de testes unitarios do projeto, substituindo o
uso atual de `node:test` via `tsx --test`. Migrar os testes existentes de
`fetchStories` para `tests/modules/reddit/`, criar testes espelhados para
todo arquivo elegivel de `src/` (excluindo `types.ts` e barris `index.ts`
puros), e mockar toda dependencia externa (rede, filesystem, ffmpeg, child
processes) para manter a suite deterministica e offline, conforme FR-001 a
FR-011 da spec. Adicionalmente, expor um comando `test:coverage` que roda a
suite com medicao de cobertura (`@vitest/coverage-v8`) e falha caso qualquer
metrica (linhas, funcoes, branches, statements) fique abaixo de 100% para os
arquivos elegiveis, conforme FR-012 a FR-014 e SC-005.

## Technical Context

**Language/Version**: TypeScript 5.5 (ESM, `NodeNext`), executado sobre Node.js via `tsx`

**Primary Dependencies**: `vitest` (novo, dev dependency), `@vitest/coverage-v8` (novo, dev dependency, obrigatorio — usado pelo comando `test:coverage` com threshold de 100%); dependencias de producao ja existentes (`fluent-ffmpeg`, `node-fetch`, `dotenv`) sao mockadas nos testes, nao exercitadas de verdade

**Storage**: N/A (arquivos de teste e fixtures locais em `tests/`; sem banco de dados)

**Testing**: Vitest (substitui `node:test` + `tsx --test` usado hoje em `fetchStories.test.ts` / `fetchStories.missing-credentials.test.ts`)

**Target Platform**: Node.js (ambiente de desenvolvimento local / CI), mesmo alvo do restante do projeto

**Project Type**: Single project — CLI/pipeline Node.js (sem frontend/backend separados)

**Performance Goals**: N/A (suite de testes unitarios; nao ha requisito de performance de execucao alem de "rodar em segundos, sem I/O real")

**Constraints**: Suite DEVE rodar sem rede real, sem credenciais reais, sem invocar ffmpeg/Piper/WhisperX de verdade (FR-009, FR-010); DEVE manter compatibilidade com ESM (`moduleResolution: NodeNext`) e com os `.js` extension imports usados no codigo-fonte; `test:coverage` DEVE impor threshold de 100% (linhas/funcoes/branches/statements) para os arquivos elegiveis (FR-013), com excecoes pontuais marcadas explicitamente no codigo quando necessario

**Scale/Scope**: ~20 arquivos de codigo-fonte em `src/` avaliados; ~14-16 elegiveis para teste apos excluir `types.ts` e os 5 barris `index.ts` puros (ver Project Structure abaixo)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principio II (Contratos Plugaveis)**: OK — testes de `piperProvider`/`elevenLabsProvider` validam cada implementacao contra o contrato `TtsProvider` isoladamente, via mock de `child_process`/`fetch`; nenhum modulo consumidor testado ramifica por implementacao concreta.
- **Principio III (Simplicidade/YAGNI)**: OK — nao introduz infraestrutura nova (sem banco, sem servidor); Vitest e uma dependencia de desenvolvimento unica, sem impacto em runtime de producao.
- **Principio IV (Isolamento de Falhas)**: OK — testes de `pipeline.ts`/`run-pipeline.ts` (se cobertos) devem exercitar explicitamente o isolamento por historia/subreddit descrito no principio, reforcando-o em vez de contorna-lo.
- **Principio V (Spec-Driven)**: OK — esta propria mudanca tem spec (`specs/011-vitest-unit-tests/spec.md`) antes da implementacao; `docs/testing.md` DEVE ser atualizado na mesma unidade de trabalho para refletir Vitest como padrao atual (ver Complexity Tracking abaixo).
- **Secao "Fluxo de Desenvolvimento e Qualidade"**: aponta `fetchStories.test.ts` com `node:test` como "o modelo a seguir" para testes automatizados. Esta feature substitui esse modelo por Vitest a pedido explicito do usuario — registrado abaixo em Complexity Tracking como desvio justificado, com atualizacao obrigatoria de `docs/testing.md` para que a constituicao/documentacao nao fiquem desatualizadas (evita violar Principio V).
- Nenhuma outra violacao identificada. Gate PASSA com a ressalva documentada acima.

## Project Structure

### Documentation (this feature)

```text
specs/011-vitest-unit-tests/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Projeto single (CLI/pipeline Node.js). `tests/` passa a existir na raiz,
espelhando `src/` arquivo a arquivo (FR-003/FR-004/FR-007). `src/*.test.ts`
existentes saem de `src/` e viram `tests/**/*.test.ts`.

```text
src/
├── config/
│   ├── env.ts                              # testar (parsing/validacao de env)
│   └── index.ts                            # EXCLUIR (barril: export * from "./env.js")
├── modules/
│   ├── captions/
│   │   ├── buildHighlightedAss.ts          # testar
│   │   ├── generateCaptions.ts             # testar
│   │   └── index.ts                        # EXCLUIR (barril)
│   ├── reddit/
│   │   ├── fetchStories.ts                 # testar (migrar testes existentes)
│   │   └── index.ts                        # EXCLUIR (barril)
│   ├── review/
│   │   ├── reviewQueue.ts                  # testar
│   │   └── index.ts                        # EXCLUIR (barril)
│   ├── tts/
│   │   ├── elevenLabsProvider.ts           # testar (mock fetch)
│   │   ├── piperProvider.ts                # testar (mock child_process/fs)
│   │   ├── quotaTracker.ts                 # testar
│   │   ├── ttsProvider.ts                  # EXCLUIR (somente interface `TtsProvider`)
│   │   └── index.ts                        # EXCLUIR (barril)
│   └── video/
│       ├── backgroundPackIndexer.ts        # testar
│       ├── backgroundVideoProvider.ts      # testar (contem `findBackgroundVideo`, mock fetch)
│       ├── composeVideo.ts                 # testar (mock fluent-ffmpeg)
│       ├── localBackgroundProvider.ts      # testar
│       └── index.ts                        # EXCLUIR (barril)
├── scripts/
│   ├── discard.ts                          # testar (orquestracao fina, mock reviewQueue)
│   ├── download-background-pack.ts         # testar
│   ├── index-background-pack.ts            # testar
│   ├── publish.ts                          # testar
│   ├── regenerate-with-elevenlabs.ts       # testar
│   └── run-pipeline.ts                     # testar
├── pipeline.ts                              # testar (mock de todos os modulos injetados)
└── types.ts                                 # EXCLUIR (somente tipos/interfaces de dados)

tests/
├── config/
│   └── env.test.ts
├── modules/
│   ├── captions/
│   │   ├── buildHighlightedAss.test.ts
│   │   └── generateCaptions.test.ts
│   ├── reddit/
│   │   ├── fetchStories.test.ts                     # migrado de src/modules/reddit/
│   │   └── fetchStories.missing-credentials.test.ts # migrado de src/modules/reddit/
│   ├── review/
│   │   └── reviewQueue.test.ts
│   ├── tts/
│   │   ├── elevenLabsProvider.test.ts
│   │   ├── piperProvider.test.ts
│   │   └── quotaTracker.test.ts
│   └── video/
│       ├── backgroundPackIndexer.test.ts
│       ├── backgroundVideoProvider.test.ts
│       ├── composeVideo.test.ts
│       └── localBackgroundProvider.test.ts
├── scripts/
│   ├── discard.test.ts
│   ├── download-background-pack.test.ts
│   ├── index-background-pack.test.ts
│   ├── publish.test.ts
│   ├── regenerate-with-elevenlabs.test.ts
│   └── run-pipeline.test.ts
└── pipeline.test.ts
```

**Structure Decision**: Opcao "single project" adaptada ao layout ja
existente do repositorio (`src/` na raiz). `tests/` e criado na raiz como
copia estrutural de `src/`, um arquivo de teste por arquivo elegivel,
excluindo apenas `src/types.ts` e os 5 arquivos `index.ts` que so reexportam
(`config`, `captions`, `reddit`, `review`, `tts`, `video` — 6 barris no
total). `src/modules/tts/ttsProvider.ts` tambem e excluido por conter
somente a interface `TtsProvider`, sem logica executavel. Os dois testes
hoje em `src/modules/reddit/*.test.ts` (escritos com `node:test`) sao
convertidos para Vitest e movidos para `tests/modules/reddit/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Substituir `node:test` (padrao hoje documentado em `docs/testing.md`/constituicao) por Vitest como executor de testes | Pedido explicito do usuario nesta feature ("implemente o vitest"); Vitest tambem resolve, de forma nativa, mocking de modulos ESM (`vi.mock`) e watch mode, que `node:test` exige configuracao manual adicional para cobrir os ~14 modulos com dependencias externas (fetch, child_process, fluent-ffmpeg) desta feature | Manter `node:test` evitaria a mudanca de ferramenta, mas contraria a instrucao direta do usuario; a tarefa de implementacao DEVE atualizar `docs/testing.md` para que o "modelo a seguir" documentado passe a referenciar Vitest, eliminando a divergencia com a constituicao (Principio V) |
| Threshold de cobertura de 100% (linhas/funcoes/branches/statements) via `test:coverage` | Pedido explicito do usuario; um threshold de 100% forca que todo caminho de erro/borda dos modulos criticos (TTS, video, revisao) seja exercitado, nao so o caminho feliz, reforcando o Principio IV (Isolamento e Contexto de Falhas) | Um threshold parcial (ex.: 80%) seria mais rapido de atingir e mais comum na industria, mas o usuario pediu explicitamente 100%; a tarefa de implementacao deve usar excecoes pontuais e marcadas (ver Assumptions em spec.md) para os poucos trechos onde 100% de branch coverage for genuinamente impraticavel (ex.: guarda que o compilador ja torna inalcancavel), em vez de reduzir a meta global |
