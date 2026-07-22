# Implementation Plan: Melhorias Recomendadas (Segurança, Débito Técnico e Performance)

**Branch**: `012-melhorias-recomendadas` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-melhorias-recomendadas/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Endereçar os achados de `ANALISE-PROJETO.md` sem introduzir infraestrutura nova: sanitizar `jobId`/`story.id` num único ponto para fechar path traversal e injeção no filtergraph do ffmpeg (US1); validar o limite de cota do ElevenLabs na inicialização para eliminar o bypass silencioso por `NaN` (US2); unificar a composição de vídeo local em uma única recodificação (US3); resolver a divergência de gerenciador de pacotes para Yarn e remover dependência morta (US4); adicionar CI via GitHub Actions rodando `vitest run --coverage` (US5); e transformar falhas silenciosas (história malformada, autenticação Reddit) em erros explícitos (US6). Toda mudança usa os mesmos padrões já estabelecidos no código (funções puras testáveis com `node:test`/Vitest, `runStage` para contexto de erro, filesystem como fila) — nenhuma dependência nova de runtime é necessária.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict, ESM/NodeNext), executado via `tsx` sobre Node.js ≥18

**Primary Dependencies**: `fluent-ffmpeg` (composição de vídeo, alvo de substituição futura mas fora de escopo aqui — ver Assumptions do spec), `dotenv`; nenhuma dependência nova de runtime é introduzida por esta feature

**Storage**: Filesystem local (`storage/pending-review|approved|published|discarded/<jobId>/`, `storage/elevenlabs-quota.json`) — sem banco de dados, conforme Princípio III da constituição

**Testing**: Vitest 4 com cobertura V8, threshold de 100% linhas/branches/funções (`vitest.config.ts`); helpers em `tests/helpers/` (`mockFetch.ts`, `tempDir.ts`, `cli.ts`)

**Target Platform**: CLI local (Linux/WSL), sem servidor

**Project Type**: Single project — pipeline CLI (`src/config`, `src/modules/{reddit,tts,captions,video,review}`, `src/pipeline.ts`, `src/scripts/`)

**Performance Goals**: Reduzir o tempo de composição de vídeo local em pelo menos 30% (SC-003) eliminando uma das duas recodificações ffmpeg hoje encadeadas (`buildLocalBackgroundVideo` → `composeVideo`)

**Constraints**: Nenhuma mudança de contrato de dados observável sem atualizar `docs/data-model.md` (Princípio V); nenhum caminho novo que publique sem passar por `storage/pending-review/` (Princípio I); `npx tsc --noEmit` e `vitest run --coverage` DEVEM passar antes de qualquer commit (Fluxo de Qualidade)

**Scale/Scope**: Uso single-user, dezenas de vídeos por execução — sem requisito de concorrência real (a US2/quota TOCTOU documentada na análise permanece aceitável e fora de escopo desta feature)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Revisão Humana Obrigatória | ✅ Nenhuma user story introduz ou altera caminho de publicação; `enqueueForReview` continua sendo o único destino do pipeline automatizado. |
| II. Contratos Plugáveis Antes de Implementação Concreta | ✅ A validação de cota (US2) fica dentro de `QuotaTracker`/`ElevenLabsProvider`, sem os módulos consumidores (`pipeline.ts`, `reviewQueue.ts`) ramificarem por provider. A sanitização de `jobId` (US1) é agnóstica de provider. |
| III. Simplicidade Deliberada (YAGNI) | ✅ Nenhuma infraestrutura nova (banco, fila gerenciada, servidor); CI (US5) usa GitHub Actions só para rodar o que já existe localmente. Unificar a composição de vídeo (US3) reduz complexidade em vez de aumentar. |
| IV. Isolamento e Contexto de Falhas | ✅ US1 (sanitização) e US6 (erros explícitos) reforçam diretamente este princípio — hoje há falhas que escapam do padrão `runStage`/erro contextualizado; a feature fecha esse gap. |
| V. Spec-Driven, Documentação Viva | ✅ Esta spec/plan documentam a decisão antes da implementação; `docs/environment.md`, `docs/testing.md` e `docs/architecture.md` precisarão de atualização pontual (gerenciador de pacotes, CI, fluxo de composição) na mesma unidade de trabalho de cada user story — rastreado nas tasks. |

Nenhuma violação identificada. Nenhuma entrada em Complexity Tracking é necessária.

## Project Structure

### Documentation (this feature)

```text
specs/012-melhorias-recomendadas/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── config/
│   └── env.ts                          # US4: engines/validação de Node (se aplicável)
├── modules/
│   ├── reddit/
│   │   └── fetchStories.ts             # US6: propagar erro de autenticação em vez de []
│   ├── tts/
│   │   ├── quotaTracker.ts             # US2: validar monthlyLimit no construtor
│   │   └── elevenLabsProvider.ts       # US2: consumidor da validação
│   ├── video/
│   │   ├── composeVideo.ts             # US1 (escapar caminho no filtergraph) + US3 (passo único)
│   │   └── localBackgroundProvider.ts  # US3: fundir com composeVideo num só comando ffmpeg
│   ├── review/
│   │   └── reviewQueue.ts              # US1: validar jobId antes de rename/read
│   └── shared/ (novo, se necessário)
│       └── sanitizeId.ts               # US1: whitelist única compartilhada
├── pipeline.ts                          # US1: aplicar sanitização na criação do jobId
├── scripts/
│   ├── lib/ (novo, se necessário)       # US4: requireEnv/parseArgs compartilhado (ver Assumptions do spec)
│   ├── publish.ts                       # US1: validar jobId de argv
│   ├── discard.ts                       # US1: validar jobId de argv
│   ├── regenerate-with-elevenlabs.ts    # US1 (jobId) + US2 (limite de cota)
│   └── run-pipeline.ts                  # US6: validar shape de histórias manuais (id/title/body)
└── types.ts                             # US6: eventual type guard de RedditStory

tests/
├── modules/{reddit,tts,video,review}/   # testes unitários espelhando os módulos acima
├── scripts/                             # testes de CLI (publish/discard/regenerate/run-pipeline)
└── pipeline.test.ts                     # cobre sanitização de jobId no ponto de criação

.github/
└── workflows/
    └── ci.yml                           # US5: novo workflow rodando `vitest run --coverage`
```

**Structure Decision**: Projeto único (CLI local), estrutura em camadas já existente é mantida integralmente. Nenhuma pasta de topo nova é introduzida — apenas arquivos dentro dos módulos já existentes, mais um possível helper compartilhado (`src/modules/shared/sanitizeId.ts` ou equivalente) para não duplicar a regex de validação de `jobId` entre `pipeline.ts`, `reviewQueue.ts` e os scripts de CLI, e o workflow `.github/workflows/ci.yml`.

## Complexity Tracking

*Nenhuma violação da Constitution Check — seção não aplicável.*
