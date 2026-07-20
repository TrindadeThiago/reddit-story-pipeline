# Implementation Plan: Módulo Reddit (busca de histórias)

**Branch**: `002-modulo-reddit` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-modulo-reddit/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Função `fetchStories` que consulta o endpoint JSON público do Reddit para
uma lista de subreddits, filtra por score mínimo e tamanho mínimo de
texto, e retorna histórias (`RedditStory`) prontas para alimentar TTS,
legendas e composição de vídeo. Uma implementação inicial já existe em
`src/modules/reddit/fetchStories.ts` e cobre US1 (busca + filtro); esta
fase de planejamento também cobre o que falta para US2 (uma falha de rede
ou subreddit inexistente hoje derruba a chamada inteira, em vez de ser
isolada e reportada).

## Technical Context

**Language/Version**: TypeScript sobre Node.js (ES2022, NodeNext), mesma
base da fase 001.

**Primary Dependencies**: `fetch` nativo do Node (sem `node-fetch`
necessário para este módulo especificamente, já que Node 18+ tem `fetch`
global); nenhuma lib de terceiros para parsing de JSON do Reddit.

**Storage**: N/A — módulo é *stateless*, não persiste histórias buscadas
(cabe ao chamador, ex: orquestrador da fase 08, decidir o que fazer com o
resultado).

**Testing**: Validação manual contra subreddits reais (conforme
`Tarefas técnicas` do spec original), sem framework de teste automatizado
definido nesta fase.

**Target Platform**: Mesma CLI/pipeline batch local da fase 001.

**Project Type**: Módulo de domínio dentro do single project
(`src/modules/reddit/`).

**Performance Goals**: Não crítico — volume de "algumas dezenas de
histórias por execução, poucas vezes ao dia" (uso pessoal), sem meta de
requisições por segundo.

**Constraints**: Respeitar o rate limit do endpoint público do Reddit
(sem autenticação OAuth nesta fase — ver FR-006 e Assumptions do spec);
User-Agent customizado obrigatório por exigência da própria API pública
do Reddit.

**Scale/Scope**: Lista pequena e fixa de subreddits por chamada (uso
típico: 2–5 subreddits), `limit` por subreddit tipicamente pequeno
(dezenas, não milhares).

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
├── types.ts                         # RedditStory (compartilhado com o resto do pipeline)
└── modules/
    └── reddit/
        └── fetchStories.ts           # fetchStories(options): Promise<RedditStory[]>
```

**Structure Decision**: Módulo único dentro da estrutura fixa definida na
fase 001 (`src/modules/reddit/`). Sem pastas novas — `RedditStory`
continua em `src/types.ts` por ser um tipo compartilhado com fases
seguintes (TTS, orquestrador).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
