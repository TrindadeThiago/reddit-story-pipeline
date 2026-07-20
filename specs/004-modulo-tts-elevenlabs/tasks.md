---

description: "Task list template for feature implementation"
---

# Tasks: Módulo TTS — ElevenLabs + controle de cota

**Input**: Design documents from `/specs/004-modulo-tts-elevenlabs/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/quotaTracker.md, quickstart.md

**Tests**: Não solicitados na spec — validação via critérios de aceite manuais (`quickstart.md`), sem suíte automatizada nesta fase.

**Organization**: Tasks agrupadas por user story (US1: síntese de qualidade superior; US2: controle de cota mensal).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 ou US2, conforme spec.md
- Caminhos de arquivo exatos incluídos em cada descrição

## Path Conventions

Single project — `src/modules/tts/`, conforme `plan.md` § Project Structure.

**Contexto importante**: `elevenLabsProvider.ts` e `quotaTracker.ts` já
existem. O gap crítico está em `elevenLabsProvider.ts`: `assertHasBudget`
e `recordUsage` (ambos `async`) são chamados **sem `await`**, então a
checagem de cota não bloqueia de fato a chamada à API antes dela
acontecer — ver `research.md` § Checagem de cota precisa ser aguardada.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar a base herdada das fases 001/003

- [X] T001 Confirmar que `src/modules/tts/elevenLabsProvider.ts` e `src/modules/tts/quotaTracker.ts` existem e que `NarrationResult` em `src/types.ts` já suporta `provider: "elevenlabs"` (herdado da fase 03)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contrato de cota compartilhado pela story crítica (US2) e usado pela US1

**⚠️ CRITICAL**: Nenhuma user story pode ser validada até esta fase estar completa

- [X] T002 Confirmar que `src/modules/tts/quotaTracker.ts` expõe `assertHasBudget(additionalChars): Promise<void>` e `recordUsage(chars): Promise<void>` exatamente conforme `contracts/quotaTracker.md`, sem alterações de assinatura

**Checkpoint**: Contrato `QuotaTracker` estável — user stories podem ser implementadas/validadas

---

## Phase 3: User Story 2 - Nunca estourar a cota mensal gratuita sem perceber (Priority: P1) 🎯 MVP

**Goal**: Uma síntese que estouraria a cota mensal é bloqueada **antes** de qualquer chamada à API do ElevenLabs, e o estado de uso é persistido e resetado corretamente.

**Independent Test**: Configurar um limite baixo, gastar cota perto do limite, e confirmar que a próxima síntese que estouraria é bloqueada sem nenhuma requisição de rede à API (ver `quickstart.md` § User Story 2).

> Tratada como MVP desta fase apesar de ser US2 no spec: sem o bloqueio de cota funcionando corretamente, usar US1 em produção é arriscado (pode gastar créditos além do plano gratuito sem perceber) — ver `research.md`.

### Implementation for User Story 2

- [X] T003 [US2] Adicionar `await` em `this.quota.assertHasBudget(text.length)` dentro de `ElevenLabsProvider.synthesize` em `src/modules/tts/elevenLabsProvider.ts`, garantindo que a promise seja resolvida/rejeitada **antes** da chamada `fetch` à API do ElevenLabs (FR-003, FR-004; fecha o gap crítico de `research.md`)
- [X] T004 [US2] Adicionar `await` em `this.quota.recordUsage(text.length)` dentro de `ElevenLabsProvider.synthesize` em `src/modules/tts/elevenLabsProvider.ts`, garantindo que o estado seja persistido antes da função retornar (FR-005, FR-007)
- [X] T005 [US2] Validar manualmente com um `monthlyLimit` baixo (ex: 100 caracteres): confirmar que uma síntese acima do limite é rejeitada **sem** nenhuma chamada de rede à API do ElevenLabs (FR-003, FR-004), seguindo `quickstart.md` § User Story 2, passo 2 — validado com `fetch` global interceptado: rejeitou com "Cota mensal do ElevenLabs estourada: 0/100" e `fetch` nunca foi chamado
- [X] T006 [US2] Validar manualmente o reset mensal: editar o arquivo de estado da cota simulando um `yearMonth` de mês anterior e confirmar que a próxima síntese trata o contador como zerado (FR-006), seguindo `quickstart.md` § User Story 2, passo 3 — validado
- [X] T007 [US2] Validar manualmente a persistência entre reinícios: rodar uma síntese, reiniciar o processo, e confirmar que `assertHasBudget` no novo processo reflete o uso da chamada anterior (FR-007), seguindo `quickstart.md` § User Story 2, passo 4 — validado (nova instância de `QuotaTracker` simulando reinício leu corretamente os 300 caracteres já usados)

**Checkpoint**: Controle de cota bloqueia de fato antes de gastar créditos, valida reset mensal e persistência entre reinícios (SC-002, SC-003, SC-004)

---

## Phase 4: User Story 1 - Regenerar narração com qualidade superior quando o Piper não convence (Priority: P1)

**Goal**: `ElevenLabsProvider.synthesize` produz um áudio pt-BR válido usando o mesmo contrato `TtsProvider` da fase 03.

**Independent Test**: Chamar `synthesize` com um texto real e um `QuotaTracker` com saldo suficiente, e confirmar que o áudio gerado é válido e que `NarrationResult.provider === "elevenlabs"` (ver `quickstart.md` § User Story 1).

### Implementation for User Story 1

- [X] T008 [US1] Confirmar em `src/modules/tts/elevenLabsProvider.ts` que a chamada à API usa `model_id: "eleven_multilingual_v2"` (suporte pt-BR) e que o áudio retornado é escrito corretamente em `outputPath` (FR-001)
- [X] T009 [US1] Confirmar em `src/modules/tts/elevenLabsProvider.ts` que `NarrationResult.provider` resolvido é sempre `"elevenlabs"` (FR-002)
- [ ] T010 [US1] Validar manualmente com um texto real e credenciais válidas de ElevenLabs, seguindo `quickstart.md` § User Story 1, confirmando áudio pt-BR válido — **BLOQUEADO**: exige `ELEVENLABS_API_KEY`/`ELEVENLABS_VOICE_ID` reais e gastaria créditos da conta; não deve ser rodado num sandbox automatizado. Rodar manualmente com credenciais reais antes de usar em produção.

**Checkpoint**: Síntese de qualidade superior funcional e validada de forma independente (SC-001)

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Fechamento da fase

- [ ] T011 Executar `quickstart.md` de ponta a ponta (US1 + US2) e confirmar todos os resultados esperados — US2 (controle de cota) 100% confirmada; falta a validação de US1 com credenciais reais do ElevenLabs (bloqueada em T010)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 — BLOQUEIA as duas user stories
- **User Story 2 (Phase 3)**: Depende de Foundational (Phase 2) completa — priorizada primeiro por ser a correção crítica de segurança de custo
- **User Story 1 (Phase 4)**: Depende de Foundational (Phase 2) completa; compartilha o mesmo arquivo (`elevenLabsProvider.ts`) que US2 — implementar US2 antes evita conflito de edição
- **Polish (Phase 5)**: Depende de US1 e US2 completas

### User Story Dependencies

- **User Story 2 (P1, crítica)**: Sem dependência funcional de US1, mas ambas alteram `elevenLabsProvider.ts` — tratar como sequencial na prática
- **User Story 1 (P1)**: Funciona de forma independente de US2 em termos de spec, mas rodar US1 sem a correção de US2 primeiro expõe o risco de estourar cota sem perceber — por isso US2 vem antes na ordem de implementação

### Parallel Opportunities

- T001 e T002 podem ser conferidos em paralelo (arquivos diferentes)
- T003–T004 (US2) tocam o mesmo bloco de código — sequencial
- T008–T009 (US1) podem ser conferidos em paralelo com a validação de US2 já concluída, mas tocam o mesmo arquivo que T003–T004 — sequencial em relação a elas

---

## Implementation Strategy

### MVP First (User Story 2 primeiro, por criticidade)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational
3. Completar Phase 3: User Story 2 (corrige o bug crítico de `await` ausente)
4. **PARAR e VALIDAR**: cota bloqueia de fato antes de gastar créditos
5. Completar Phase 4: User Story 1 (síntese de qualidade superior, agora sobre uma base de cota segura)

### Incremental Delivery

1. Setup + Foundational → contrato de cota estável
2. US2 → corrigir e validar o bloqueio de cota → seguro para usar o provedor pago (MVP de segurança!)
3. US1 → validar a síntese em si → caminho de regeneração completo
4. Polish → `quickstart.md` validado ponta a ponta

---

## Notes

- T003–T004 fecham o gap crítico identificado em `research.md` — sem essa correção, o controle de cota não bloqueia chamadas reais à API antes delas acontecerem.
- Cache/reaproveitamento de áudio e alertas de cota por e-mail permanecem fora de escopo (spec.md § Assumptions) — nenhuma task aqui cobre isso.
