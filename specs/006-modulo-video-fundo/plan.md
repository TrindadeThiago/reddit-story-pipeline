# Implementation Plan: Módulo de Vídeo de Fundo (Pexels)

**Branch**: `006-modulo-video-fundo` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-modulo-video-fundo/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

`findBackgroundVideo(query, pexelsApiKey)` consulta a API do Pexels,
filtra por orientação retrato e retorna a URL de download do arquivo de
maior qualidade vertical disponível + duração do vídeo. Já existe em
`src/modules/video/backgroundVideoProvider.ts`, mas há um gap: quando a
busca encontra vídeos mas nenhum arquivo individual está em orientação
vertical, o filtro `video_files.filter(...)[0]` resulta em `undefined`, e
o acesso seguinte a `file.link` quebra com um `TypeError` genérico — em
vez do erro claro exigido por FR-006/US2. Esta fase de planejamento cobre
essa correção antes de validar SC-002.

## Technical Context

**Language/Version**: TypeScript sobre Node.js (ES2022, NodeNext), mesma
base das fases anteriores.

**Primary Dependencies**: `fetch` nativo do Node (API do Pexels) — sem
dependências npm novas.

**Storage**: N/A — módulo é *stateless*, não baixa nem armazena o vídeo
localmente (a fase 07 consome a URL diretamente, ver spec § Assumptions).

**Testing**: Validação manual com 2–3 descrições de cena reais, conforme
`Tarefas técnicas` do spec original — sem framework de teste automatizado
nesta fase.

**Target Platform**: Mesma CLI/pipeline batch local, com acesso de rede
de saída para `api.pexels.com`.

**Project Type**: Módulo de domínio dentro do single project
(`src/modules/video/`).

**Performance Goals**: Não crítico — uma busca por história processada,
sem meta de latência definida.

**Constraints**: Requer `PEXELS_API_KEY` válida (fase 001); depende da
API do Pexels retornar `video_files` com `width`/`height` preenchidos
para o filtro de orientação funcionar.

**Scale/Scope**: Uma busca por chamada, `per_page=5` já fixado no código
existente — escopo pequeno, sem paginação.

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
    └── video/
        └── backgroundVideoProvider.ts   # findBackgroundVideo(query, pexelsApiKey)
```

**Structure Decision**: Módulo único dentro da estrutura fixa da fase
001 (`src/modules/video/`). A fase 07 adiciona `composeVideo.ts` no mesmo
diretório, sem alterar este arquivo.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
