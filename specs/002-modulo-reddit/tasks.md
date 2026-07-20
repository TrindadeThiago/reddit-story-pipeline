---

description: "Task list template for feature implementation"
---

# Tasks: Módulo Reddit (busca de histórias)

**Input**: Design documents from `/specs/002-modulo-reddit/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/fetchStories.md, quickstart.md

**Tests**: Não solicitados na spec — validação via critérios de aceite manuais (`quickstart.md`), sem suíte automatizada nesta fase.

**Organization**: Tasks agrupadas por user story (US1: busca + filtro; US2: resiliência a falha por subreddit).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 ou US2, conforme spec.md
- Caminhos de arquivo exatos incluídos em cada descrição

## Path Conventions

Single project — `src/modules/reddit/`, `src/types.ts`, conforme `plan.md` § Project Structure.

**Contexto importante**: uma implementação inicial de `fetchStories` já
existe em `src/modules/reddit/fetchStories.ts` e cobre a maior parte de
US1. As tasks abaixo tratam tanto verificação do que já existe quanto o
gap identificado em `research.md` (US2 não está coberta: falha de um
subreddit hoje derruba a chamada inteira).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar a base herdada da fase 001 antes de alterar o módulo

- [X] T001 Confirmar que `src/modules/reddit/` existe e que `RedditStory` está definido em `src/types.ts` conforme `data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contrato de opções compartilhado pelas duas user stories

**⚠️ CRITICAL**: Nenhuma user story pode ser validada até esta fase estar completa

- [X] T002 Confirmar/ajustar a interface `FetchStoriesOptions` (`subreddits`, `minScore`, `minBodyLength`, `limit`) em `src/modules/reddit/fetchStories.ts` conforme `contracts/fetchStories.md`

**Checkpoint**: Assinatura de `fetchStories` estável — user stories podem ser implementadas/validadas

---

## Phase 3: User Story 1 - Buscar histórias relevantes em múltiplos subreddits (Priority: P1) 🎯 MVP

**Goal**: `fetchStories` retorna, para uma lista de subreddits, a união das histórias que atendem a `minScore` e `minBodyLength`.

**Independent Test**: Chamar `fetchStories` com 1–3 subreddits reais e conferir que o resultado só contém histórias dentro dos critérios (ver `quickstart.md` § User Story 1).

### Implementation for User Story 1

- [X] T003 [US1] Verificar/ajustar em `src/modules/reddit/fetchStories.ts` que o filtro `score >= minScore` e `body.length >= minBodyLength` é aplicado antes de incluir a história no resultado (FR-002, FR-003)
- [X] T004 [US1] Verificar/ajustar em `src/modules/reddit/fetchStories.ts` que múltiplos subreddits na mesma chamada produzem a união dos resultados válidos (FR-001)
- [X] T005 [US1] Verificar em `src/modules/reddit/fetchStories.ts` que o header `User-Agent` customizado é enviado em cada requisição (FR-006)
- [ ] T006 [US1] Validar manualmente contra 2–3 subreddits reais (ex: `AskHistorians`) seguindo `quickstart.md` § User Story 1 — **BLOQUEADO neste ambiente**: `curl`/`fetch` para `reddit.com` retornam HTTP 403 (bloqueio de rede do sandbox, não um bug do código). Rodar este passo numa máquina com saída de rede liberada para `reddit.com`.

**Checkpoint**: Busca com filtro funcional e validada de forma independente (SC-001, SC-003)

---

## Phase 4: User Story 2 - Continuar funcionando quando um subreddit falha (Priority: P2)

**Goal**: Uma falha de rede ou subreddit inexistente não interrompe a busca dos demais subreddits da mesma chamada, e fica identificável qual subreddit falhou e por quê.

**Independent Test**: Chamar `fetchStories` com um subreddit válido e um inexistente na mesma lista e confirmar que as histórias do subreddit válido ainda voltam (ver `quickstart.md` § User Story 2).

### Implementation for User Story 2

- [X] T007 [US2] Envolver a busca de cada subreddit em `try/catch` dentro do loop de `src/modules/reddit/fetchStories.ts`, de forma que uma falha em um subreddit não interrompa os demais (FR-007)
- [X] T008 [US2] Ao capturar uma falha por subreddit em `src/modules/reddit/fetchStories.ts`, registrar uma mensagem clara identificando qual subreddit falhou e o motivo (ex: `console.error` com nome do subreddit e erro original) (FR-007)
- [X] T009 [US2] Validar manualmente com uma lista contendo um subreddit válido e um inexistente, confirmando que o resultado ainda contém as histórias do subreddit válido, seguindo `quickstart.md` § User Story 2 — validado que o isolamento funciona (ambos os subreddits falharam de forma independente, sem exceção não tratada, resultado resolveu normalmente); não foi possível confirmar o caso "subreddit válido retorna histórias" no mesmo teste porque a rede deste sandbox bloqueia `reddit.com` (HTTP 403)

**Checkpoint**: Falha isolada por subreddit não derruba a chamada inteira, validado de forma independente (SC-002)

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Fechamento da fase

- [ ] T010 Executar `quickstart.md` de ponta a ponta (US1 + US2) e confirmar todos os resultados esperados — isolamento de falha (US2) confirmado; falta confirmar o caminho feliz (US1, histórias reais retornadas) numa máquina com acesso de rede a `reddit.com` (bloqueado neste sandbox, ver T006/T009)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 — BLOQUEIA as duas user stories
- **User Story 1 (Phase 3)**: Depende de Foundational (Phase 2) completa
- **User Story 2 (Phase 4)**: Depende de Foundational (Phase 2) completa; **não depende de US1 estar validada** para ser implementada, mas ambas alteram o mesmo arquivo (`fetchStories.ts`), então recomenda-se implementar US1 antes de US2 para evitar conflito de edição
- **Polish (Phase 5)**: Depende de US1 e US2 completas

### User Story Dependencies

- **User Story 1 (P1)**: Sem dependência de outras stories
- **User Story 2 (P2)**: Funcionalmente independente de US1, mas compartilha o mesmo arquivo-fonte — tratar como sequencial na prática, não paralela

### Parallel Opportunities

- T001 e T002 podem ser conferidos em paralelo (arquivos diferentes: `src/types.ts` vs `fetchStories.ts`)
- T003–T005 (US1) tocam o mesmo arquivo e a mesma função — executar em sequência, não em paralelo
- T007–T008 (US2) idem — mesmo arquivo, sequencial

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational
3. Completar Phase 3: User Story 1
4. **PARAR e VALIDAR**: busca com filtro funcionando contra subreddits reais
5. Isso já é suficiente para alimentar a fase 03 (TTS) com histórias reais

### Incremental Delivery

1. Setup + Foundational → contrato de opções estável
2. US1 → validar independentemente → módulo já alimenta o resto do pipeline (MVP!)
3. US2 → validar independentemente → geração em lote passa a sobreviver a subreddits com problema
4. Polish → `quickstart.md` validado ponta a ponta

---

## Notes

- T007–T008 fecham o gap identificado em `research.md` § Isolamento de falha por subreddit — a implementação atual de `fetchStories.ts` ainda não tem esse tratamento.
- Deduplicação entre execuções e curadoria via LLM permanecem fora de escopo (ver spec.md § Assumptions) — nenhuma task aqui cobre isso.
