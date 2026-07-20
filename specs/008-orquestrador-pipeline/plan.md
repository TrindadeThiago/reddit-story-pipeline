# Implementation Plan: Orquestrador do Pipeline

**Branch**: `008-orquestrador-pipeline` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-orquestrador-pipeline/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

`runPipelineForStory(story, deps)` encadeia narração → legenda → vídeo de
fundo → composição → enfileiramento para uma única história, com
`deps.ttsProvider` injetado (Piper no fluxo normal, ElevenLabs na
regeneração), reaproveitando a mesma função para os dois casos. Já existe
em `src/pipeline.ts`, mas tem um bug de integração crítico: passa
`background.downloadUrl` (URL remota da fase 06) diretamente como
`backgroundVideoPath` para `composeVideo` (fase 07), que — desde a
correção feita no plano da fase 07 — verifica `existsSync` no caminho
antes de rodar o ffmpeg. Uma URL remota nunca passa em `existsSync`,
então toda execução do orquestrador quebra na etapa de composição com
"arquivo não encontrado", mesmo estando tudo certo. Esta fase de
planejamento cobre o download do vídeo de fundo para um arquivo local
antes da composição, e o encadeamento de erros com contexto de etapa
(FR-005).

## Technical Context

**Language/Version**: TypeScript sobre Node.js (ES2022, NodeNext), mesma
base das fases anteriores.

**Primary Dependencies**: `fetch` nativo do Node (download do vídeo de
fundo) + `node:fs/promises` (gravação do arquivo local) — sem
dependências npm novas; reaproveita `TtsProvider`, `generateCaptions`,
`findBackgroundVideo`, `composeVideo`, `enqueueForReview` das fases
anteriores.

**Storage**: Sistema de arquivos local — grava os artefatos de cada
história em `storage/pending-review/<jobId>/` (narração, legenda, vídeo
de fundo baixado, vídeo final), antes do enfileiramento (fase 09) mover a
pasta inteira.

**Testing**: Validação manual ponta a ponta com uma história real,
conforme `Tarefas técnicas` do spec original — sem framework de teste
automatizado nesta fase.

**Target Platform**: Mesma CLI/pipeline batch local, dependendo de todas
as fases anteriores (02–07) já implementadas e com pré-requisitos de
ambiente instalados (ffmpeg, Piper, WhisperX).

**Project Type**: Ponto de composição no single project — `src/pipeline.ts`
na raiz de `src/`, acima dos módulos de domínio.

**Performance Goals**: Não crítico — uma história por execução, sem
paralelismo (ver spec § Assumptions); tempo total é a soma das etapas
individuais.

**Constraints**: Depende de todas as fases 02–07 estarem corretas; um bug
em qualquer uma delas se propaga para o orquestrador (como demonstra o
próprio bug de integração desta fase).

**Scale/Scope**: Uma história por chamada; `jobId` único por execução
(`${story.id}-${Date.now()}`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` ainda não foi preenchido para este
projeto (placeholders não substituídos) — não há princípios ratificados
para verificar. Gate tratado como **PASS por ausência de constraints**;
nenhuma violação a registrar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
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
├── pipeline.ts                        # runPipelineForStory(story, deps)
├── types.ts                            # PipelineJob (inalterado)
└── modules/
    ├── tts/                            # fases 03-04, consumido via TtsProvider
    ├── captions/                       # fase 05, consumido via generateCaptions
    ├── video/                          # fases 06-07, consumido via findBackgroundVideo + composeVideo
    └── review/                         # fase 09, consumido via enqueueForReview
```

**Structure Decision**: Nenhuma pasta nova — `pipeline.ts` já existe na
raiz de `src/` e só é ajustado internamente (download do vídeo de fundo
antes da composição, contexto de erro por etapa).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
