---

description: "Task list template for feature implementation"
---

# Tasks: Testes Unitarios com Vitest

**Input**: Design documents from `/specs/011-vitest-unit-tests/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Esta feature *e* a introducao de testes automatizados — cada tarefa de "implementacao" abaixo e a criacao de um arquivo de teste. Nao ha uma fase TDD separada porque nao existe codigo de producao novo sendo escrito; o artefato entregue e o proprio arquivo de teste.

**Organization**: Tarefas agrupadas por user story (spec.md), na ordem de prioridade P1 → P2 → P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependencia entre si)
- **[Story]**: A qual user story a tarefa pertence (US1, US2, US3)
- Caminhos de arquivo exatos incluidos em cada descricao

## Path Conventions

Projeto single (CLI Node.js). `src/` e `tests/` na raiz do repositorio, conforme `plan.md` §Project Structure. `tests/` espelha `src/` arquivo a arquivo.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Instalar e configurar o Vitest como executor de testes do projeto

- [X] T001 Instalar `vitest` e `@vitest/coverage-v8` como devDependencies em `package.json` (via `yarn add -D vitest @vitest/coverage-v8`)
- [X] T002 Criar `vitest.config.ts` na raiz do repositorio: `test.include: ["tests/**/*.test.ts"]`, `test.environment: "node"`, `test.globals: false`, `test.coverage.provider: "v8"`, `test.coverage.include: ["src/**/*.ts"]`, `test.coverage.exclude` cobrindo `src/types.ts`, todo `src/**/index.ts` e `src/modules/tts/ttsProvider.ts`, `test.coverage.thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 }`, `test.coverage.reporter: ["text", "html"]` (conforme research.md §1 e §5)
- [X] T003 [P] Atualizar `package.json`: script `"test"` passa a ser `"vitest run"` e novo script `"test:coverage"` como `"vitest run --coverage"` (substitui o `"test": "tsx --test src/**/*.test.ts"` atual)
- [X] T004 [P] Criar esqueleto de diretorios `tests/config/`, `tests/modules/captions/`, `tests/modules/reddit/`, `tests/modules/review/`, `tests/modules/tts/`, `tests/modules/video/`, `tests/scripts/` (mesma arvore de `src/`, conforme plan.md §Project Structure)

**Checkpoint**: `yarn test` e `yarn test:coverage` executam (mesmo que sem nenhum arquivo `.test.ts` ainda) sem erro de configuracao

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Helpers de teste compartilhados que multiplas user stories vao reusar

**⚠️ CRITICAL**: Nenhuma tarefa de user story deve comecar antes desta fase estar completa

- [X] T005 [P] Criar helper de diretorio temporario em `tests/helpers/tempDir.ts` (wrapper de `fs.mkdtempSync(path.join(os.tmpdir(), ...))` + funcao de limpeza, usado pelos testes de `reviewQueue`, `backgroundPackIndexer`, `localBackgroundProvider`, `download-background-pack`, `index-background-pack`, conforme research.md §2)
- [X] T006 [P] Criar helper de mock de `fetch` em `tests/helpers/mockFetch.ts` (wrapper de `vi.stubGlobal("fetch", vi.fn())` retornando um builder de `Response` fake, usado pelos testes de `fetchStories`, `elevenLabsProvider`, `backgroundVideoProvider`, conforme research.md §2)

**Checkpoint**: Helpers compartilhados prontos — as user stories abaixo podem comecar

---

## Phase 3: User Story 1 - Rodar a suite de testes unitarios com um unico comando (Priority: P1) 🎯 MVP

**Goal**: `yarn test` roda via Vitest e reporta pass/fail claramente, com os testes ja existentes do modulo Reddit migrados e funcionando.

**Independent Test**: Rodar `yarn test` em um checkout limpo e ver o resumo de testes passando; introduzir uma asserção falsa temporaria e confirmar que a falha e reportada com codigo de saida diferente de 0 (quickstart.md §"Confirmar que um teste falho e reportado corretamente").

### Implementation for User Story 1

- [X] T007 [P] [US1] Migrar `src/modules/reddit/fetchStories.test.ts` para `tests/modules/reddit/fetchStories.test.ts`, convertendo de `node:test`/`node:assert` para Vitest (`describe`/`it`/`expect`) e usando `tests/helpers/mockFetch.ts` no lugar do mock de `fetch` atual (FR-008)
- [X] T008 [P] [US1] Migrar `src/modules/reddit/fetchStories.missing-credentials.test.ts` para `tests/modules/reddit/fetchStories.missing-credentials.test.ts`, mesma conversao de `node:test` para Vitest (FR-008)
- [X] T009 [US1] Remover `src/modules/reddit/fetchStories.test.ts` e `src/modules/reddit/fetchStories.missing-credentials.test.ts` de dentro de `src/` (depende de T007, T008 estarem passando em `tests/`)
- [X] T010 [US1] Validar manualmente o cenario de falha do quickstart.md: introduzir e reverter uma asserção falsa em `tests/modules/reddit/fetchStories.test.ts`, confirmando que `yarn test` reporta arquivo/teste/motivo e termina com exit code != 0

**Checkpoint**: `yarn test` roda via Vitest, com os dois arquivos de teste do Reddit funcionando e a suite reportando pass/fail corretamente — User Story 1 esta completa e testavel isoladamente

---

## Phase 4: User Story 2 - Estrutura de testes espelha a estrutura de codigo-fonte (Priority: P2)

**Goal**: Todo arquivo elegivel de `src/scripts/` e `src/pipeline.ts` (a camada de orquestracao) tem um teste no caminho espelhado em `tests/`, completando a cobertura estrutural iniciada em US1.

**Independent Test**: Comparar a lista de arquivos elegiveis de `src/` com os arquivos `.test.ts` de `tests/` (comando `find` do quickstart.md §"Validar a estrutura espelhada") e confirmar correspondencia 1:1 para os arquivos desta fase.

### Implementation for User Story 2

- [X] T011 [P] [US2] Criar `tests/config/env.test.ts` para `src/config/env.ts` — validar carregamento com todas as variaveis obrigatorias presentes e o erro claro quando alguma esta ausente/invalida
- [X] T012 [P] [US2] Criar `tests/pipeline.test.ts` para `src/pipeline.ts` — mockar os modulos injetados (TTS, legendas, video, revisao) e validar a orquestracao e o isolamento de falha por historia/subreddit (Principio IV da constituicao)
- [X] T013 [P] [US2] Criar `tests/scripts/run-pipeline.test.ts` para `src/scripts/run-pipeline.ts` — mockar `pipeline`/`fetchStories`, validar parsing dos argumentos de CLI (`--input`, `--story`, `--limit`) e o encaminhamento correto para o pipeline
- [X] T014 [P] [US2] Criar `tests/scripts/publish.test.ts` para `src/scripts/publish.ts` — mockar `reviewQueue`, validar transicao de `jobId` para o estado `published`
- [X] T015 [P] [US2] Criar `tests/scripts/discard.test.ts` para `src/scripts/discard.ts` — mockar `reviewQueue`, validar transicao de `jobId` para o estado `discarded`
- [X] T016 [P] [US2] Criar `tests/scripts/regenerate-with-elevenlabs.test.ts` para `src/scripts/regenerate-with-elevenlabs.ts` — mockar `pipeline`, `elevenLabsProvider` e `reviewQueue`, validar a regeneracao de narracao para um `jobId` existente
- [X] T017 [P] [US2] Criar `tests/scripts/download-background-pack.test.ts` para `src/scripts/download-background-pack.ts` — mockar `fetch` (via `tests/helpers/mockFetch.ts`) e sistema de arquivos, validar a flag `--limit`
- [X] T018 [P] [US2] Criar `tests/scripts/index-background-pack.test.ts` para `src/scripts/index-background-pack.ts` — usar `tests/helpers/tempDir.ts` para simular um pack de video local e validar a indexacao gerada

**Checkpoint**: Todos os arquivos de `src/scripts/` e `src/pipeline.ts` tem teste espelhado em `tests/`; combinado com US1 (Reddit), a estrutura espelhada esta completa exceto pelos modulos de logica critica cobertos em US3

---

## Phase 5: User Story 3 - Cobertura de logica de negocio critica do pipeline (Priority: P3)

**Goal**: Modulos de configuracao, legendas, TTS, video de fundo e fila de revisao tem testes unitarios cobrindo caminho feliz e casos de borda/erro.

**Independent Test**: Revisar o relatorio de execucao (`yarn test`) e confirmar que cada modulo desta lista tem ao menos um teste de sucesso e um de erro/borda passando.

### Implementation for User Story 3

- [X] T019 [P] [US3] Criar `tests/modules/captions/generateCaptions.test.ts` para `src/modules/captions/generateCaptions.ts` — validar a formatacao de legendas para entradas validas e casos de borda (texto vazio, timestamps no limite)
- [X] T020 [P] [US3] Criar `tests/modules/captions/buildHighlightedAss.test.ts` para `src/modules/captions/buildHighlightedAss.ts` — validar a geracao do `.ass` com destaque de palavras para entradas validas e invalidas
- [X] T021 [P] [US3] Criar `tests/modules/tts/quotaTracker.test.ts` para `src/modules/tts/quotaTracker.ts` — validar incremento de uso, e o comportamento quando o limite de cota e atingido/excedido
- [X] T022 [P] [US3] Criar `tests/modules/tts/piperProvider.test.ts` para `src/modules/tts/piperProvider.ts` — mockar `child_process`/`fs`, validar sintese com sucesso e o tratamento de erro quando o binario falha
- [X] T023 [P] [US3] Criar `tests/modules/tts/elevenLabsProvider.test.ts` para `src/modules/tts/elevenLabsProvider.ts` — usar `tests/helpers/mockFetch.ts`, validar sintese com sucesso, erro de API e limite de cota (integracao com `quotaTracker`)
- [X] T024 [P] [US3] Criar `tests/modules/video/backgroundPackIndexer.test.ts` para `src/modules/video/backgroundPackIndexer.ts` — usar `tests/helpers/tempDir.ts` para simular um pack de video e validar a indexacao de cenas
- [X] T025 [P] [US3] Criar `tests/modules/video/backgroundVideoProvider.test.ts` para `src/modules/video/backgroundVideoProvider.ts` — usar `tests/helpers/mockFetch.ts` para simular a resposta do Pexels, validar selecao de video vertical e os dois casos de erro (`Nenhum video encontrado` / `Nenhum arquivo de video em orientacao retrato`)
- [X] T026 [P] [US3] Criar `tests/modules/video/composeVideo.test.ts` para `src/modules/video/composeVideo.ts` — mockar `fluent-ffmpeg` (cadeia `.input().output().on().run()`), validar composicao com sucesso e propagacao do evento de erro
- [X] T027 [P] [US3] Criar `tests/modules/video/localBackgroundProvider.test.ts` para `src/modules/video/localBackgroundProvider.ts` — usar `tests/helpers/tempDir.ts`, validar selecao de cena local com sucesso e o caso de pack vazio/ausente
- [X] T028 [US3] Criar `tests/modules/review/reviewQueue.test.ts` para `src/modules/review/reviewQueue.ts` — usar `tests/helpers/tempDir.ts`, validar as transicoes de estado `pending-review` → `approved`/`discarded` → `published`

**Checkpoint**: Todos os modulos de logica critica listados na spec (config, captions, TTS, video de fundo, fila de revisao, Reddit) tem cobertura de sucesso e de borda/erro — User Story 3 completa

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Fechar os requisitos de estrutura completa e cobertura de 100% que dependem de todas as user stories anteriores estarem prontas

- [X] T029 Rodar a comparacao de arvore de diretorios do quickstart.md (§"Validar a estrutura espelhada") e confirmar que todo arquivo elegivel de `src/` tem um `.test.ts` correspondente em `tests/` (FR-004, FR-007, SC-002)
- [X] T030 Rodar `yarn test:coverage` e iterar nos testes ate atingir 100% em linhas, funcoes, branches e statements para todos os arquivos elegiveis; onde 100% de branch coverage for genuinamente impraticavel, marcar a excecao explicitamente no codigo em vez de reduzir a meta global (FR-012, FR-013, FR-014, SC-005)
- [X] T031 [P] Atualizar `docs/testing.md` para referenciar o Vitest (e `tests/` como local dos testes) como padrao atual, substituindo a mencao a `node:test`/`fetchStories.test.ts` em `src/`, conforme Principio V da constituicao e plan.md §Complexity Tracking
- [X] T032 Rodar `npx tsc --noEmit` e confirmar que passa sem erros, conforme a constituicao §"Fluxo de Desenvolvimento e Qualidade"
- [X] T033 Rodar a checklist completa de `quickstart.md` de ponta a ponta (suite completa, watch mode, teste por modulo, cobertura) e confirmar todos os resultados esperados

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependencias — pode comecar imediatamente
- **Foundational (Phase 2)**: Depende da conclusao do Setup — BLOQUEIA todas as user stories
- **User Stories (Phase 3+)**: Todas dependem da conclusao da fase Foundational
  - US1 pode comecar assim que Foundational terminar
  - US2 e US3 podem comecar em paralelo entre si assim que Foundational terminar (nao dependem uma da outra nem de US1 para os proprios arquivos, embora usem os mesmos helpers)
- **Polish (Phase 6)**: Depende de US1, US2 e US3 completas (a verificacao estrutural e o threshold de cobertura so fecham com tudo escrito)

### User Story Dependencies

- **User Story 1 (P1)**: Pode comecar apos Foundational — sem dependencia de outras stories
- **User Story 2 (P2)**: Pode comecar apos Foundational — independente de US1/US3 (arquivos diferentes)
- **User Story 3 (P3)**: Pode comecar apos Foundational — independente de US1/US2 (arquivos diferentes)

### Within Each User Story

- Tarefas marcadas `[P]` dentro da mesma fase tocam arquivos diferentes e podem rodar em paralelo
- T009 (US1) depende de T007 e T008 (so remove os testes antigos depois que os novos passam)
- T023 (US3, elevenLabsProvider) depende conceitualmente de T021 (quotaTracker) existir como referencia de contrato, mas sao arquivos de teste distintos e podem ser escritos em paralelo
- Historia completa antes de mover para a proxima prioridade, se a execucao for sequencial

### Parallel Opportunities

- Todas as tarefas de Setup marcadas `[P]` (T003, T004) podem rodar em paralelo apos T001/T002
- As duas tarefas de Foundational (T005, T006) podem rodar em paralelo
- Uma vez Foundational concluida, US1, US2 e US3 podem ser trabalhadas em paralelo por pessoas diferentes
- Dentro de US2: T011-T018 podem todas rodar em paralelo (arquivos diferentes)
- Dentro de US3: T019-T027 podem todas rodar em paralelo; T028 depende apenas do helper `tempDir` (Foundational), nao das demais

---

## Parallel Example: User Story 1

```bash
# Migrar os dois arquivos de teste do Reddit em paralelo:
Task: "Migrar src/modules/reddit/fetchStories.test.ts para tests/modules/reddit/fetchStories.test.ts (Vitest)"
Task: "Migrar src/modules/reddit/fetchStories.missing-credentials.test.ts para tests/modules/reddit/fetchStories.missing-credentials.test.ts (Vitest)"
```

## Parallel Example: User Story 3

```bash
# Escrever os testes de TTS e video em paralelo (arquivos diferentes, helpers ja prontos da fase Foundational):
Task: "Criar tests/modules/tts/quotaTracker.test.ts"
Task: "Criar tests/modules/tts/piperProvider.test.ts"
Task: "Criar tests/modules/tts/elevenLabsProvider.test.ts"
Task: "Criar tests/modules/video/backgroundPackIndexer.test.ts"
Task: "Criar tests/modules/video/backgroundVideoProvider.test.ts"
Task: "Criar tests/modules/video/composeVideo.test.ts"
Task: "Criar tests/modules/video/localBackgroundProvider.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational
3. Completar Phase 3: User Story 1 (Vitest funcionando + testes do Reddit migrados)
4. **PARAR e VALIDAR**: rodar `yarn test` e confirmar o cenario de falha do quickstart.md
5. Nesse ponto ja existe uma suite Vitest funcional, mesmo que cobrindo so um modulo

### Incremental Delivery

1. Setup + Foundational → ferramenta pronta
2. Adicionar US1 → validar isoladamente → suite roda com os testes do Reddit
3. Adicionar US2 → validar isoladamente → scripts/pipeline cobertos, estrutura espelhada quase completa
4. Adicionar US3 → validar isoladamente → modulos de logica critica cobertos
5. Phase 6 (Polish) → fecha verificacao estrutural (FR-004/007) e o threshold de 100% de cobertura (FR-012-014)

### Parallel Team Strategy

Com multiplas pessoas:

1. Time completa Setup + Foundational junto
2. Apos Foundational:
   - Pessoa A: User Story 1 (Reddit)
   - Pessoa B: User Story 2 (scripts + pipeline)
   - Pessoa C: User Story 3 (config, captions, TTS, video, review)
3. Stories completam e integram de forma independente; Phase 6 roda so depois que as tres estiverem prontas

---

## Notes

- `[P]` = arquivos diferentes, sem dependencia entre si
- O rotulo de story mapeia a tarefa a uma user story especifica para rastreabilidade
- Cada user story deve ser completavel e testavel de forma independente
- Commit apos cada tarefa ou grupo logico de tarefas
- Parar em qualquer checkpoint para validar a story isoladamente
- Evitar: tarefas vagas, conflito no mesmo arquivo, dependencias entre stories que quebrem a independencia
