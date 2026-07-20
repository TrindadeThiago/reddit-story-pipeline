---

description: "Task list template for feature implementation"
---

# Tasks: Módulo de Vídeo de Fundo (Pexels)

**Input**: Design documents from `/specs/006-modulo-video-fundo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/findBackgroundVideo.md, quickstart.md

**Tests**: Não solicitados na spec — validação via critérios de aceite manuais (`quickstart.md`), sem suíte automatizada nesta fase.

**Organization**: Tasks agrupadas por user story (US1: busca de vídeo vertical; US2: erro claro sem resultado adequado).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 ou US2, conforme spec.md
- Caminhos de arquivo exatos incluídos em cada descrição

## Path Conventions

Single project — `src/modules/video/`, conforme `plan.md` § Project Structure.

**Contexto importante**: `findBackgroundVideo` já existe em
`backgroundVideoProvider.ts`. O gap está em US2: quando nenhum arquivo
vertical é encontrado, o código quebra com `TypeError` genérico em vez de
um erro claro — ver `research.md` § Erro claro quando nenhum arquivo
vertical é encontrado.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar a base herdada da fase 001

- [X] T001 Confirmar que `src/modules/video/backgroundVideoProvider.ts` existe e expõe `findBackgroundVideo(query, pexelsApiKey)` conforme `contracts/findBackgroundVideo.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Nenhum pré-requisito bloqueante adicional além da função já existir

**⚠️ CRITICAL**: Nenhuma user story pode ser validada até esta fase estar completa

- [X] T002 Confirmar que a chamada à API do Pexels em `backgroundVideoProvider.ts` usa `orientation=portrait` e envia `PEXELS_API_KEY` no header `Authorization`, conforme `data-model.md`

**Checkpoint**: Chamada à API estável — user stories podem ser implementadas/validadas

---

## Phase 3: User Story 1 - Encontrar um vídeo de fundo vertical para a narração (Priority: P1) 🎯 MVP

**Goal**: `findBackgroundVideo` retorna a URL de download do arquivo vertical de maior resolução, com a duração do vídeo.

**Independent Test**: Chamar `findBackgroundVideo` com uma query real e confirmar `downloadUrl` + `durationSeconds` válidos, sempre em orientação retrato (ver `quickstart.md` § User Story 1).

### Implementation for User Story 1

- [X] T003 [US1] Confirmar em `backgroundVideoProvider.ts` que o filtro `f.width < f.height` seleciona corretamente apenas arquivos verticais (FR-002) — validado com fetch mockado (3 arquivos, só verticais retornados)
- [X] T004 [US1] Confirmar em `backgroundVideoProvider.ts` que a ordenação por `height` decrescente escolhe o arquivo de maior resolução vertical entre os filtrados (FR-003) — validado: entre 720x1280 e 1080x1920, escolheu corretamente o de 1920 de altura
- [ ] T005 [US1] Validar manualmente com 2–3 queries reais (ex: "pessoa organizando mesa", "paisagem de floresta"), seguindo `quickstart.md` § User Story 1 — **BLOQUEADO**: exige `PEXELS_API_KEY` real e acesso de rede a `api.pexels.com`, não disponível/apropriado neste sandbox automatizado. A lógica de filtro/ordenação já foi validada com dados mockados (T003/T004); falta confirmar contra respostas reais da API.

**Checkpoint**: Busca de vídeo vertical funcional e validada de forma independente (SC-001, SC-003)

---

## Phase 4: User Story 2 - Saber quando nenhuma cena adequada foi encontrada (Priority: P2)

**Goal**: Buscas sem resultado ou sem opção vertical terminam em erro claro e identificável, nunca em falha genérica.

**Independent Test**: Chamar `findBackgroundVideo` com uma query sem resultado e confirmar erro identificando a query (ver `quickstart.md` § User Story 2).

### Implementation for User Story 2

- [X] T006 [US2] Confirmar em `backgroundVideoProvider.ts` que `if (!video) throw new Error(...)` identifica a `query` usada quando a busca não retorna nenhum vídeo (FR-005) — já implementado, apenas confirmar — validado com fetch mockado (`videos: []`): `"Nenhum video encontrado para query: query sem resultado"`
- [X] T007 [US2] Adicionar em `backgroundVideoProvider.ts`, após o `filter`+`sort` dos arquivos verticais, uma checagem explícita de array vazio que lança um erro claro identificando a `query` e a ausência de opção vertical, **antes** de acessar `[0].link` (FR-006; fecha o gap crítico de `research.md`)
- [X] T008 [US2] Validar manualmente com uma query sem resultado (confirmar erro do tipo T006) e, se possível reproduzir, com uma query cujos resultados não tenham arquivo vertical (confirmar erro do tipo T007, não um `TypeError`), seguindo `quickstart.md` § User Story 2 — validado com fetch mockado retornando só arquivo horizontal (1920x1080): rejeitou com `"Nenhum arquivo de video em orientacao retrato encontrado para query: query sem opcao vertical"`, não um `TypeError`

**Checkpoint**: Erros claros e identificáveis em ambos os cenários de falha, validado de forma independente (SC-002)

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Fechamento da fase

- [ ] T009 Executar `quickstart.md` de ponta a ponta (US1 + US2) e confirmar todos os resultados esperados, sem nenhum `TypeError`/`undefined` genérico nos cenários de falha — lógica e erros confirmados com `fetch` mockado; falta confirmar contra a API real do Pexels (T005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 — BLOQUEIA as duas user stories
- **User Story 1 (Phase 3)**: Depende de Foundational (Phase 2) completa
- **User Story 2 (Phase 4)**: Depende de Foundational (Phase 2) completa; compartilha o mesmo arquivo que US1 (`backgroundVideoProvider.ts`) — recomenda-se sequencial
- **Polish (Phase 5)**: Depende de US1 e US2 completas

### User Story Dependencies

- **User Story 1 (P1)**: Sem dependência de outras stories
- **User Story 2 (P2)**: Funcionalmente independente de US1, mas compartilha o arquivo-fonte — tratar como sequencial na prática

### Parallel Opportunities

- T001 e T002 podem ser conferidos em paralelo (leitura de assinatura vs. leitura da chamada à API, mesmo arquivo mas trechos diferentes — baixo risco de conflito)
- T003–T004 (US1) e T007 (US2) tocam o mesmo bloco de código — sequencial

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational
3. Completar Phase 3: User Story 1
4. **PARAR e VALIDAR**: busca retorna vídeo vertical válido para queries reais
5. Isso já é suficiente para alimentar a fase 07 (composição de vídeo) no caminho feliz

### Incremental Delivery

1. Setup + Foundational → chamada à API confirmada
2. US1 → validar busca e escolha do arquivo de maior resolução → módulo funcional no caminho feliz (MVP!)
3. US2 → corrigir e validar o erro claro para o caso sem opção vertical → geração em lote não quebra com erro confuso
4. Polish → `quickstart.md` validado ponta a ponta

---

## Notes

- T007 fecha o gap identificado em `research.md` — sem essa correção, uma busca sem arquivo vertical quebra com um erro que não identifica a causa raiz.
- Download/cache local do vídeo e curadoria de qualidade do clipe permanecem fora de escopo (spec.md § Assumptions) — nenhuma task aqui cobre isso.
