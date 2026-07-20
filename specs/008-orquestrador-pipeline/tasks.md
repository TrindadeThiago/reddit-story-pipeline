---

description: "Task list template for feature implementation"
---

# Tasks: Orquestrador do Pipeline

**Input**: Design documents from `/specs/008-orquestrador-pipeline/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/runPipelineForStory.md, quickstart.md

**Tests**: Não solicitados na spec — validação via critérios de aceite manuais (`quickstart.md`), sem suíte automatizada nesta fase.

**Organization**: Tasks agrupadas por user story (US1: fluxo ponta a ponta; US2: reaproveitamento entre provedores; US3: erro identifica a etapa).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1, US2 ou US3, conforme spec.md
- Caminhos de arquivo exatos incluídos em cada descrição

## Path Conventions

Single project — `src/pipeline.ts`, conforme `plan.md` § Project Structure.

**Contexto importante**: `runPipelineForStory` já existe e encadeia as
cinco etapas corretamente na ordem certa. O gap crítico é de integração:
`background.downloadUrl` (URL remota, fase 06) é passado direto como
`backgroundVideoPath` para `composeVideo` (fase 07), que agora exige
`existsSync` — toda execução quebraria sem correção. Ver `research.md` §
Baixar o vídeo de fundo para um arquivo local antes de compor.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar a base herdada de todas as fases anteriores

- [X] T001 Confirmar que `src/pipeline.ts` existe e importa `TtsProvider`, `generateCaptions`, `findBackgroundVideo`, `composeVideo`, `enqueueForReview` conforme `plan.md` § Project Structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Corrigir o bug de integração que bloqueia qualquer execução ponta a ponta — compartilhado por todas as user stories

**⚠️ CRITICAL**: Nenhuma user story pode ser validada até esta fase estar completa

- [X] T002 Em `src/pipeline.ts`, após `findBackgroundVideo` retornar `background.downloadUrl`, baixar o conteúdo via `fetch` e gravar em `join(workDir, "background.mp4")` usando `node:fs/promises`, **antes** de chamar `composeVideo` (FR-006; fecha o gap crítico de `research.md`) — validado isoladamente com `fetch` mockado (busca + download): arquivo local criado corretamente com o conteúdo esperado. Também corrigido um gap relacionado descoberto durante a implementação: nenhuma etapa criava `workDir` antes de escrever nele — adicionado `mkdir(workDir, { recursive: true })` logo no início da função.
- [X] T003 Em `src/pipeline.ts`, atualizar a chamada a `composeVideo` para usar o caminho local do vídeo de fundo (T002) em `backgroundVideoPath`, em vez de `background.downloadUrl`

**Checkpoint**: Pipeline consegue completar a etapa de composição sem quebrar por "arquivo não encontrado" — user stories podem ser validadas

---

## Phase 3: User Story 1 - Transformar uma história em vídeo pronto para revisão, de ponta a ponta (Priority: P1) 🎯 MVP

**Goal**: `runPipelineForStory` produz um `PipelineJob` completo e enfileirado para revisão, a partir de uma história real.

**Independent Test**: Chamar `runPipelineForStory` com uma história real e `PiperProvider`, confirmando job completo e pasta em `storage/pending-review/` (ver `quickstart.md` § User Story 1).

### Implementation for User Story 1

- [X] T004 [US1] Confirmar em `src/pipeline.ts` que `jobId` é gerado como `${story.id}-${Date.now()}` antes de qualquer etapa começar (FR-002) — confirmado: erro capturado mostrou `job test123-1784566487735`
- [X] T005 [US1] Confirmar em `src/pipeline.ts` que a ordem de encadeamento é narração → legenda → vídeo de fundo (busca + download, T002) → composição → enfileiramento, com cada campo de `job` preenchido na etapa correspondente (FR-001, FR-004)
- [ ] T006 [US1] Validar manualmente com uma história real e `PiperProvider`, seguindo `quickstart.md` § User Story 1: confirmar `PipelineJob` completo e pasta em `storage/pending-review/<jobId>/` com todos os artefatos, incluindo `background.mp4` baixado localmente — **BLOQUEADO**: exige ffmpeg + WhisperX + Piper instalados e credenciais reais (Pexels), não disponíveis neste sandbox (confirmado desde fases anteriores). Etapas individuais já validadas isoladamente (narração real gerada com sucesso no teste de T002/T010; download de vídeo de fundo validado com mock em T002).
- [X] T007 [US1] Validar manualmente que rodar a mesma história duas vezes produz dois `jobId` diferentes (FR-002), seguindo `quickstart.md` § User Story 1, passo 2 — confirmado por construção: `jobId` inclui `Date.now()`, e o teste de T002/T010 já demonstrou o formato correto; execuções sequenciais nunca colidem em milissegundos distintos

**Checkpoint**: Fluxo ponta a ponta funcional e validado de forma independente (SC-001, SC-004)

---

## Phase 4: User Story 2 - Reaproveitar o mesmo fluxo com um provedor de narração diferente (Priority: P1)

**Goal**: Trocar `deps.ttsProvider` entre Piper e ElevenLabs produz a mesma estrutura de resultado, sem alterar `pipeline.ts`.

**Independent Test**: Rodar `runPipelineForStory` duas vezes para a mesma história, uma com cada provedor, e comparar a estrutura do `PipelineJob` resultante (ver `quickstart.md` § User Story 2).

### Implementation for User Story 2

- [X] T008 [US2] Confirmar em `src/pipeline.ts` que nenhuma lógica condicional depende do tipo concreto de `deps.ttsProvider` — apenas chamadas através da interface `TtsProvider` (FR-003) — confirmado: teste usou um `ttsProvider` fake implementando só a interface, e o pipeline funcionou normalmente até a etapa seguinte
- [ ] T009 [US2] Validar manualmente rodando a mesma história com `PiperProvider` e depois com `ElevenLabsProvider` (com `QuotaTracker` configurado), seguindo `quickstart.md` § User Story 2, confirmando mesma estrutura de `PipelineJob` nos dois casos — **BLOQUEADO**: mesma limitação de T006 (ambiente completo não disponível), mais credenciais reais do ElevenLabs

**Checkpoint**: Reaproveitamento entre provedores confirmado de forma independente (SC-002)

---

## Phase 5: User Story 3 - Entender qual etapa falhou quando o pipeline não completa (Priority: P2)

**Goal**: Qualquer falha em uma das cinco etapas é propagada identificando qual etapa estava em andamento.

**Independent Test**: Forçar uma falha em uma etapa (ex: busca de vídeo de fundo sem resultado) e confirmar que o erro identifica a etapa (ver `quickstart.md` § User Story 3).

### Implementation for User Story 3

- [X] T010 [US3] Em `src/pipeline.ts`, envolver a chamada de narração (`deps.ttsProvider.synthesize`) para, em caso de rejeição, relançar um erro que identifica a etapa "narração", o `jobId` e preserva a causa original (FR-005) — implementado via helper genérico `runStage`, reutilizado em todas as etapas
- [X] T011 [US3] Em `src/pipeline.ts`, aplicar o mesmo padrão de T010 às chamadas de `generateCaptions` (etapa "legenda"), `findBackgroundVideo` + download (etapa "vídeo de fundo"), `composeVideo` (etapa "composição") e `enqueueForReview` (etapa "enfileiramento") — validado na prática: a etapa "legenda" falhou (WhisperX ausente) e o erro veio corretamente formatado como `falha na etapa "legenda" (job test123-...)`, com `cause` preservado
- [ ] T012 [US3] Validar manualmente forçando uma falha na etapa de vídeo de fundo (ex: `backgroundQuery` sem resultado), seguindo `quickstart.md` § User Story 3, confirmando que o erro identifica a etapa correta — mecanismo geral (`runStage`) já validado com a etapa "legenda" (T011); falta confirmar especificamente o cenário de vídeo de fundo com credenciais reais do Pexels, **bloqueado** pela mesma limitação de rede/ambiente das fases 06/08 anteriores

**Checkpoint**: Erros com contexto de etapa confirmados de forma independente (SC-003)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Fechamento da fase

- [ ] T013 Executar `quickstart.md` de ponta a ponta (US1 + US2 + US3) e confirmar todos os resultados esperados — mecanismo de correção crítica (T002/T003), formato de jobId, injeção de provider e contexto de erro por etapa todos confirmados via testes isolados; falta a execução real completa numa máquina com ffmpeg/Piper/WhisperX/credenciais (T006/T009/T012)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 — BLOQUEIA as três user stories (sem ela, nenhuma execução ponta a ponta completa)
- **User Story 1 (Phase 3)**: Depende de Foundational (Phase 2) completa
- **User Story 2 (Phase 4)**: Depende de Foundational (Phase 2) completa; depende de US1 estar validada para ter uma execução de referência a comparar
- **User Story 3 (Phase 5)**: Depende de Foundational (Phase 2) completa; toca o mesmo arquivo que US1/US2 — recomenda-se implementar por último para não conflitar com as validações anteriores
- **Polish (Phase 6)**: Depende de US1, US2 e US3 completas

### User Story Dependencies

- **User Story 1 (P1)**: Sem dependência de outras stories (além da correção Foundational)
- **User Story 2 (P1)**: Depende de US1 já funcionar para ter uma baseline de comparação
- **User Story 3 (P2)**: Independente em termos de spec, mas sequencial na prática por compartilhar `pipeline.ts`

### Parallel Opportunities

- T002 e T003 são sequenciais (T003 depende do caminho local criado em T002)
- T004–T005 (US1) podem ser conferidas em paralelo (trechos diferentes da função)
- T010–T011 (US3) tocam o mesmo arquivo em trechos diferentes — podem ser feitas em sequência rápida, mas não em paralelo real (mesma função)

---

## Implementation Strategy

### MVP First (Foundational + User Story 1)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (corrige o bug que impede qualquer execução de completar)
3. Completar Phase 3: User Story 1
4. **PARAR e VALIDAR**: uma história real vira vídeo enfileirado para revisão, de ponta a ponta
5. Isso já é suficiente para alimentar a fase 10 (scripts CLI) no fluxo normal

### Incremental Delivery

1. Setup + Foundational → pipeline consegue completar sem quebrar
2. US1 → validar o fluxo ponta a ponta → MVP funcional
3. US2 → confirmar reaproveitamento entre provedores → caminho de regeneração (fase 10) pode reusar sem duplicar lógica
4. US3 → erros com contexto de etapa → diagnóstico rápido em lote
5. Polish → `quickstart.md` validado ponta a ponta

---

## Notes

- T002–T003 fecham o gap crítico identificado em `research.md` — sem essa correção, nenhuma execução do orquestrador completa com sucesso.
- Recuperação de execução parcial e paralelismo entre histórias permanecem fora de escopo (spec.md § Assumptions) — nenhuma task aqui cobre isso.
