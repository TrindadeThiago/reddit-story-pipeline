# Implementation Plan: Fila de Revisão Manual

**Branch**: `009-fila-revisao` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-fila-revisao/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

`enqueueForReview(job)` grava `job.json` + arquivos do job em
`storage/pending-review/<jobId>/`; `readPendingJob(jobId)` lê de volta;
`moveToApproved`/`moveToPublished`/`moveToDiscarded` movem a pasta entre
os diretórios de estado. Já implementado em
`src/modules/review/reviewQueue.ts`, mas `enqueueForReview` não cria a
pasta de destino antes de escrever `job.json` — hoje só funciona porque o
orquestrador (fase 08) já criou essa mesma pasta antes de chamar esta
função, uma dependência implícita que viola o contrato da própria função
(FR-002). Esta fase de planejamento cobre essa correção.

## Technical Context

**Language/Version**: TypeScript sobre Node.js (ES2022, NodeNext), mesma
base das fases anteriores.

**Primary Dependencies**: `node:fs/promises` (`mkdir`, `rename`,
`writeFile`, `readFile`) — sem dependências npm novas.

**Storage**: Sistema de arquivos local — quatro diretórios de estado
(`storage/{pending-review,approved,published,discarded}`, já criados na
fase 001) contendo uma subpasta por `jobId`.

**Testing**: Validação manual do ciclo completo (enqueue → read → approve
→ publish) e do ciclo alternativo (enqueue → discard), conforme `Tarefas
técnicas` do spec original — sem framework de teste automatizado nesta
fase.

**Target Platform**: Mesma CLI/pipeline batch local; nenhuma dependência
externa de rede ou binário.

**Project Type**: Módulo de domínio dentro do single project
(`src/modules/review/`).

**Performance Goals**: Não crítico — operações de arquivo local, sem meta
de performance específica.

**Constraints**: `rename` do Node.js funciona apenas dentro do mesmo
sistema de arquivos/dispositivo — assume-se que todos os diretórios de
estado estão no mesmo volume (já garantido pela estrutura da fase 001,
todos sob `storage/`).

**Scale/Scope**: Um job por operação; sem paginação ou listagem em massa
nesta fase.

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
└── modules/
    └── review/
        └── reviewQueue.ts   # enqueueForReview, readPendingJob, moveToApproved/Published/Discarded

storage/
├── pending-review/<jobId>/  # job.json + artefatos, criado por enqueueForReview
├── approved/<jobId>/
├── published/<jobId>/
└── discarded/<jobId>/
```

**Structure Decision**: Módulo único dentro da estrutura fixa da fase
001 (`src/modules/review/`). Sem pastas novas — os quatro diretórios de
estado já existem desde a fase 001.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
