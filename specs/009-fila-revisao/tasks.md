---

description: "Task list template for feature implementation"
---

# Tasks: Fila de Revisão Manual

**Input**: Design documents from `/specs/009-fila-revisao/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/reviewQueue.md, quickstart.md

**Tests**: Não solicitados na spec — validação via critérios de aceite manuais (`quickstart.md`), sem suíte automatizada nesta fase.

**Organization**: Tasks agrupadas por user story (US1: pasta previsível; US2: movimentação limpa entre estados; US3: erro claro para job inexistente).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1, US2 ou US3, conforme spec.md
- Caminhos de arquivo exatos incluídos em cada descrição

## Path Conventions

Single project — `src/modules/review/`, conforme `plan.md` § Project Structure.

**Contexto importante**: `reviewQueue.ts` já implementa as cinco funções.
O gap está em `enqueueForReview`, que hoje depende implicitamente do
orquestrador (fase 08) já ter criado a pasta de destino — ver
`research.md` § `enqueueForReview` deve criar a pasta de destino.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar a base herdada da fase 001

- [X] T001 Confirmar que `src/modules/review/reviewQueue.ts` existe e exporta as cinco funções (`enqueueForReview`, `readPendingJob`, `moveToApproved`, `moveToPublished`, `moveToDiscarded`) conforme `contracts/reviewQueue.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Corrigir a dependência implícita que torna `enqueueForReview` frágil fora do fluxo do orquestrador

**⚠️ CRITICAL**: Nenhuma user story pode ser validada de forma verdadeiramente independente até esta fase estar completa

- [X] T002 Em `src/modules/review/reviewQueue.ts`, adicionar `await mkdir(jobDir, { recursive: true })` no início de `enqueueForReview`, antes do `writeFile` de `job.json` (FR-002; fecha o gap de `research.md`) — validado: `enqueueForReview` chamado diretamente (sem passar pelo orquestrador) criou a pasta com sucesso

**Checkpoint**: `enqueueForReview` funciona de forma autônoma, sem depender de outro módulo já ter criado a pasta

---

## Phase 3: User Story 1 - Encontrar cada vídeo pronto em um lugar previsível para revisar (Priority: P1) 🎯 MVP

**Goal**: `enqueueForReview` grava um job completo em uma pasta previsível; `readPendingJob` reconstrói os mesmos dados.

**Independent Test**: Enfileirar um `PipelineJob` de teste (sem rodar o pipeline inteiro) e confirmar pasta + leitura de volta (ver `quickstart.md` § User Story 1).

### Implementation for User Story 1

- [X] T003 [US1] Validar manualmente com um `PipelineJob` de teste, chamando `enqueueForReview(job)` diretamente (sem passar pelo orquestrador) e confirmando que a pasta `storage/pending-review/<jobId>/` é criada com `job.json`, seguindo `quickstart.md` § User Story 1, passo 1 — este é o teste que comprova a correção de T002 — confirmado
- [X] T004 [US1] Validar manualmente que `readPendingJob(jobId)` reconstrói o mesmo objeto `job` enfileirado, incluindo `story` (FR-003), seguindo `quickstart.md` § User Story 1, passo 2 — confirmado: JSON round-trip idêntico

**Checkpoint**: Pasta previsível e leitura de volta funcionais, validados de forma independente (SC-001)

---

## Phase 4: User Story 2 - Mover um job entre os estados de decisão sem duplicar dados (Priority: P1)

**Goal**: `moveToApproved`/`moveToPublished`/`moveToDiscarded` movem a pasta sem deixar duplicata.

**Independent Test**: Percorrer os dois caminhos possíveis (aprovar → publicar; ou descartar) e confirmar que a pasta existe em exatamente um lugar a cada passo (ver `quickstart.md` § User Story 2).

### Implementation for User Story 2

- [X] T005 [US2] Validar manualmente o ciclo `enqueueForReview` → `moveToApproved` → `moveToPublished`, confirmando a cada passo que a pasta existe apenas no novo estado (FR-004, FR-005), seguindo `quickstart.md` § User Story 2, passos 1–2 — confirmado: pasta migrou corretamente por pending-review → approved → published, sem duplicata
- [X] T006 [US2] Validar manualmente o ciclo alternativo `enqueueForReview` → `moveToDiscarded`, confirmando que a pasta existe apenas em `discarded` ao final (FR-004, FR-005), seguindo `quickstart.md` § User Story 2, passo 3 — confirmado

**Checkpoint**: Movimentação sem duplicação confirmada de forma independente (SC-002, SC-004)

---

## Phase 5: User Story 3 - Saber quando uma decisão é aplicada a um job que não existe mais (Priority: P2)

**Goal**: Mover um `jobId` inexistente no estado de origem esperado resulta em erro claro.

**Independent Test**: Tentar `moveToApproved` com um `jobId` inexistente e confirmar erro identificável (ver `quickstart.md` § User Story 3).

### Implementation for User Story 3

- [X] T007 [US3] Validar manualmente que `moveToApproved("job-que-nao-existe")` rejeita com um erro que identifica o caminho de origem não encontrado (FR-006), seguindo `quickstart.md` § User Story 3, passo 1 — confirmado: `ENOENT: no such file or directory, rename 'storage/pending-review/job-que-nao-existe-nunca' -> 'storage/approved/job-que-nao-existe-nunca'`
- [X] T008 [US3] Validar manualmente que chamar `moveToPublished` duas vezes seguidas para o mesmo `jobId` falha claramente na segunda chamada (job já não está mais em `approved`), seguindo `quickstart.md` § User Story 3, passo 2 — confirmado

**Checkpoint**: Erros claros para job inexistente confirmados de forma independente (SC-003)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Fechamento da fase

- [X] T009 Executar `quickstart.md` de ponta a ponta (US1 + US2 + US3) e confirmar todos os resultados esperados — todos os cenários confirmados em um único teste de ponta a ponta (sem dependências externas, diferente das fases anteriores)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 — BLOQUEIA a validação independente de US1 (que hoje só funciona por acidente, via fase 08)
- **User Story 1 (Phase 3)**: Depende de Foundational (Phase 2) completa
- **User Story 2 (Phase 4)**: Depende de User Story 1 (precisa de um job já enfileirado para mover)
- **User Story 3 (Phase 5)**: Depende de Foundational (Phase 2); pode rodar em paralelo com US1/US2 já que testa o caminho de erro, não o caminho feliz
- **Polish (Phase 6)**: Depende de US1, US2 e US3 completas

### User Story Dependencies

- **User Story 1 (P1)**: Depende apenas da correção Foundational (T002)
- **User Story 2 (P1)**: Depende de US1 (precisa enfileirar antes de mover)
- **User Story 3 (P2)**: Independente do caminho feliz — testa apenas o caminho de erro

### Parallel Opportunities

- T001 e T002 podem ser conferidos/aplicados em paralelo (leitura de assinatura vs. edição da implementação)
- T007–T008 (US3) podem rodar em paralelo com T003–T006 (US1/US2), já que usam um `jobId` diferente (inexistente) e não competem pelo mesmo estado

---

## Implementation Strategy

### MVP First (Foundational + User Story 1)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (corrige `enqueueForReview`)
3. Completar Phase 3: User Story 1
4. **PARAR e VALIDAR**: job enfileirado de forma previsível e legível de volta, sem depender do orquestrador
5. Isso já é suficiente para o orquestrador (fase 08) e os scripts CLI (fase 10) confiarem na fila

### Incremental Delivery

1. Setup + Foundational → `enqueueForReview` autônomo
2. US1 → validar pasta previsível + leitura → base da fila pronta (MVP!)
3. US2 → validar movimentação sem duplicação → ciclo de decisão completo
4. US3 → validar erros claros → operação segura mesmo com comandos repetidos por engano
5. Polish → `quickstart.md` validado ponta a ponta

---

## Notes

- T002 fecha o gap identificado em `research.md` — sem essa correção, `enqueueForReview` só funciona quando chamada através do orquestrador (fase 08), que hoje cria a pasta como efeito colateral.
- Interface visual de revisão e notificação automática permanecem fora de escopo (spec.md § Assumptions) — nenhuma task aqui cobre isso.
