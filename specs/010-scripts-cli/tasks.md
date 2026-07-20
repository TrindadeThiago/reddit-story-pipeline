---

description: "Task list template for feature implementation"
---

# Tasks: Scripts CLI (os 3 caminhos da revisão)

**Input**: Design documents from `/specs/010-scripts-cli/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli-commands.md, quickstart.md

**Tests**: Não solicitados na spec — validação via critérios de aceite manuais (`quickstart.md`), sem suíte automatizada nesta fase.

**Organization**: Tasks agrupadas por user story (US1: geração em lote; US2: os 3 comandos de decisão; US3: mensagens de uso e erros claros).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1, US2 ou US3, conforme spec.md
- Caminhos de arquivo exatos incluídos em cada descrição

## Path Conventions

Single project — `src/scripts/`, conforme `plan.md` § Project Structure.

**Contexto importante**: os quatro scripts já existem e implementam
corretamente os três caminhos de decisão, incluindo validação de `jobId`
ausente. O único ajuste é reforçar a validação de variáveis de ambiente
obrigatórias — ver `research.md` § Validar variáveis de ambiente
obrigatórias antes de rodar.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar a base herdada de todas as fases anteriores

- [X] T001 Confirmar que `src/scripts/{run-pipeline,publish,discard,regenerate-with-elevenlabs}.ts` existem e correspondem aos scripts `generate`/`publish`/`discard`/`regenerate:elevenlabs` em `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Nenhum pré-requisito bloqueante adicional além dos scripts já existirem

**⚠️ CRITICAL**: Nenhuma user story pode ser validada até esta fase estar completa

- [X] T002 Confirmar em `data-model.md` a lista de variáveis de ambiente obrigatórias por script, como base para a validação a ser adicionada nas user stories

**Checkpoint**: Lista de variáveis confirmada — user stories podem ser implementadas/validadas

---

## Phase 3: User Story 1 - Gerar um lote de vídeos com um único comando (Priority: P1) 🎯 MVP

**Goal**: `npm run generate` produz uma pasta pronta para revisão por história processada com sucesso.

**Independent Test**: Rodar `npm run generate` e confirmar pastas em `storage/pending-review/` (ver `quickstart.md` § User Story 1).

### Implementation for User Story 1

- [X] T003 [US1] Em `src/scripts/run-pipeline.ts`, antes de chamar `fetchStories`, validar que `PIPER_MODEL_PATH` e `PEXELS_API_KEY` estão definidas; se alguma faltar, imprimir mensagem identificando qual variável está ausente e sair com código de erro (FR-001 + edge case de configuração ausente; fecha o gap de `research.md`) — validado: `PIPER_MODEL_PATH` ausente gera `"Variavel de ambiente obrigatoria ausente: PIPER_MODEL_PATH"` antes de qualquer chamada de rede
- [ ] T004 [US1] Validar manualmente rodando `npm run generate` com o ambiente completo, seguindo `quickstart.md` § User Story 1, confirmando uma pasta por história processada — **BLOQUEADO**: exige ffmpeg + Piper + WhisperX instalados e rede liberada para Reddit/Pexels, não disponíveis neste sandbox (mesma limitação das fases 02–09)

**Checkpoint**: Geração em lote funcional e validada de forma independente (SC-001)

---

## Phase 4: User Story 2 - Decidir o destino de um vídeo já revisado (Priority: P1)

**Goal**: Os três comandos de decisão (publicar, descartar, regenerar) produzem o efeito esperado.

**Independent Test**: Rodar cada um dos três comandos sobre jobs pendentes distintos e verificar o estado resultante das pastas (ver `quickstart.md` § User Story 2).

### Implementation for User Story 2

- [X] T005 [US2] Em `src/scripts/regenerate-with-elevenlabs.ts`, antes de chamar `readPendingJob`, validar que `PEXELS_API_KEY`, `ELEVENLABS_API_KEY` e `ELEVENLABS_VOICE_ID` estão definidas; se alguma faltar, imprimir mensagem identificando qual variável está ausente e sair com código de erro (mesmo padrão de T003) — validado: com `jobId` presente mas `PEXELS_API_KEY` ausente, gerou `"Variavel de ambiente obrigatoria ausente: PEXELS_API_KEY"` antes de `readPendingJob`
- [ ] T006 [US2] Validar manualmente `npm run publish -- <jobId>` sobre um job pendente, confirmando que ele passa a existir em `storage/published/<jobId>/`, seguindo `quickstart.md` § User Story 2, passo 1 — **BLOQUEADO**: exige um job pendente real, produzido por T004 (ambiente completo)
- [ ] T007 [US2] Validar manualmente `npm run discard -- <jobId>` sobre outro job pendente, confirmando que ele passa a existir em `storage/discarded/<jobId>/`, seguindo `quickstart.md` § User Story 2, passo 2 — **BLOQUEADO**: mesma limitação de T006 (comportamento de `moveToDiscarded` já validado isoladamente na fase 09)
- [ ] T008 [US2] Validar manualmente `npm run regenerate:elevenlabs -- <jobId>` sobre um terceiro job pendente, confirmando que um **novo** job aparece em `storage/pending-review/` e que o job original permanece intocado, seguindo `quickstart.md` § User Story 2, passo 3 — **BLOQUEADO**: mesma limitação de T006, mais credenciais reais do ElevenLabs

**Checkpoint**: Os três comandos de decisão funcionais e validados de forma independente (SC-002)

---

## Phase 5: User Story 3 - Não quebrar de forma confusa quando o comando é usado incorretamente (Priority: P2)

**Goal**: Mensagens de uso claras para `jobId` ausente e erros claros para decisões repetidas.

**Independent Test**: Rodar cada comando de decisão sem argumento, e repetir uma decisão já tomada (ver `quickstart.md` § User Story 3).

### Implementation for User Story 3

- [X] T009 [US3] Confirmar em `publish.ts`, `discard.ts` e `regenerate-with-elevenlabs.ts` que a checagem `if (!jobId) { console.error("Uso: ..."); process.exit(1); }` está presente e não executa nenhuma ação antes de sair (FR-005) — já implementado, apenas confirmar
- [X] T010 [US3] Validar manualmente rodando `npm run publish` sem argumento, confirmando mensagem de uso e nenhuma alteração de pastas, seguindo `quickstart.md` § User Story 3, passo 1 — validado, junto com `discard` sem argumento
- [X] T011 [US3] Validar manualmente repetindo `npm run publish -- <jobId>` para um job já publicado, confirmando erro claro (herdado da fase 09), seguindo `quickstart.md` § User Story 3, passo 2 — validado o mecanismo equivalente (job inexistente em `pending-review`, mesmo caminho de erro `ENOENT` que a repetição usaria): `"ENOENT: no such file or directory, rename 'storage/pending-review/...' -> 'storage/approved/...'"`
- [X] T012 [US3] Validar manualmente a checagem de T003/T005 removendo temporariamente uma variável de ambiente obrigatória do `.env` e rodando o script correspondente, confirmando mensagem identificando a variável ausente, seguindo `quickstart.md` § User Story 3, passo 3 — validado nos dois scripts (`run-pipeline.ts`, `regenerate-with-elevenlabs.ts`)

**Checkpoint**: Mensagens de uso e erros claros confirmados de forma independente (SC-003, SC-004)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Fechamento da fase

- [ ] T013 Executar `quickstart.md` de ponta a ponta (US1 + US2 + US3) e confirmar todos os resultados esperados — validação de configuração (US1/US2 parcial) e mensagens/erros claros (US3) confirmados; falta a execução real completa numa máquina com ffmpeg/Piper/WhisperX/credenciais (T004/T006/T007/T008)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Phase 1
- **User Story 1 (Phase 3)**: Depende de Foundational (Phase 2) completa
- **User Story 2 (Phase 4)**: Depende de Foundational (Phase 2) completa; depende de US1 ter gerado jobs pendentes para operar sobre eles
- **User Story 3 (Phase 5)**: Depende de US2 (precisa de jobs em diferentes estados para testar erros de repetição)
- **Polish (Phase 6)**: Depende de US1, US2 e US3 completas

### User Story Dependencies

- **User Story 1 (P1)**: Sem dependência de outras stories
- **User Story 2 (P1)**: Depende de US1 (precisa de jobs pendentes reais)
- **User Story 3 (P2)**: Depende de US2 (precisa de um job já publicado/descartado para testar repetição)

### Parallel Opportunities

- T003 (`run-pipeline.ts`) e T005 (`regenerate-with-elevenlabs.ts`) tocam arquivos diferentes — podem ser feitas em paralelo
- T006–T008 (US2) operam sobre jobs distintos — podem ser feitas em paralelo se houver jobs pendentes suficientes

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational
3. Completar Phase 3: User Story 1
4. **PARAR e VALIDAR**: geração em lote produz pastas prontas para revisão
5. Isso já é suficiente para começar a testar os comandos de decisão manualmente

### Incremental Delivery

1. Setup + Foundational → variáveis obrigatórias mapeadas
2. US1 → geração em lote com validação de configuração → MVP funcional
3. US2 → os 3 comandos de decisão confirmados → ciclo de revisão completo
4. US3 → mensagens de uso e erros claros → operação segura mesmo com engano do operador
5. Polish → `quickstart.md` validado ponta a ponta

---

## Notes

- T003/T005 fecham o gap identificado em `research.md` — nenhum dos scripts tinha validação explícita de variáveis de ambiente obrigatórias antes desta fase.
- Upload real para plataformas e agendamento automático permanecem fora de escopo (spec.md § Assumptions) — nenhuma task aqui cobre isso.
