---

description: "Task list template for feature implementation"
---

# Tasks: Módulo TTS — Piper + interface plugável

**Input**: Design documents from `/specs/003-modulo-tts-piper/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ttsProvider.md, quickstart.md

**Tests**: Não solicitados na spec — validação via critérios de aceite manuais (`quickstart.md`), sem suíte automatizada nesta fase.

**Organization**: Tasks agrupadas por user story (US1: narração local pt-BR; US2: contrato plugável estável).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 ou US2, conforme spec.md
- Caminhos de arquivo exatos incluídos em cada descrição

## Path Conventions

Single project — `src/modules/tts/`, `src/types.ts`, conforme `plan.md` § Project Structure.

**Contexto importante**: `ttsProvider.ts` (contrato) e `piperProvider.ts`
(implementação) já existem. O gap real está em como o texto é passado ao
subprocesso do Piper — ver `research.md` § Como alimentar o texto ao
processo do Piper.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar a base herdada das fases 001/002

- [X] T001 Confirmar que `src/modules/tts/` existe e que `NarrationResult` está definido em `src/types.ts` conforme `data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contrato compartilhado pelas duas user stories

**⚠️ CRITICAL**: Nenhuma user story pode ser validada até esta fase estar completa

- [X] T002 Confirmar que `src/modules/tts/ttsProvider.ts` expõe a interface `TtsProvider` (`name`, `synthesize(text, outputPath)`) exatamente conforme `contracts/ttsProvider.md`, sem alterações de assinatura

**Checkpoint**: Contrato `TtsProvider` estável — user stories podem ser implementadas/validadas

---

## Phase 3: User Story 1 - Gerar narração local e gratuita a partir do texto da história (Priority: P1) 🎯 MVP

**Goal**: `PiperProvider.synthesize` produz um arquivo de áudio pt-BR válido e completo a partir de um texto de história.

**Independent Test**: Chamar `synthesize` com um texto real (2000+ caracteres) e um caminho de saída, e confirmar que o arquivo gerado é um áudio válido, em português, cobrindo o texto inteiro (ver `quickstart.md` § User Story 1).

### Implementation for User Story 1

- [X] T003 [US1] Corrigir em `src/modules/tts/piperProvider.ts` a forma de alimentar o texto ao processo do Piper: trocar `execFile(..., { input: text } as any)` por `child_process.spawn`, escrevendo `text` em `child.stdin` e aguardando o processo finalizar antes de resolver a promise (FR-001; fecha o gap de `research.md`)
- [X] T004 [US1] Remover o cast `as any` e o comentário `TODO` associado em `src/modules/tts/piperProvider.ts`, agora que a chamada usa uma API do Node com tipos corretos
- [X] T005 [US1] Garantir em `src/modules/tts/piperProvider.ts` que uma falha do processo Piper (exit code != 0, stderr com erro) rejeita a promise com uma mensagem identificável, em vez de resolver com um `NarrationResult` apontando para um arquivo inexistente/corrompido — validado com um binário `piper` falso que sai com código 1
- [X] T006 [US1] Validar manualmente com um texto real de história (2000+ caracteres) seguindo `quickstart.md` § User Story 1, confirmando áudio pt-BR válido e completo — validado com o binário Piper real (instalado em `~/.local/bin/piper`) e o modelo `pt_BR-faber-medium` (Hugging Face): texto de 2130 caracteres gerou um `.wav` válido (RIFF/WAVE, 22050 Hz mono) de 119,7 segundos via `PiperProvider.synthesize`

**Checkpoint**: Narração local funcional e validada de forma independente (SC-001, SC-002)

---

## Phase 4: User Story 2 - Trocar de provedor de narração sem alterar o restante do pipeline (Priority: P2)

**Goal**: O contrato `TtsProvider` é suficiente para qualquer consumidor (fase 04, fase 08) usar `PiperProvider` sem código condicional específico.

**Independent Test**: Inspecionar `NarrationResult.provider` após uma síntese e confirmar, por leitura de código, que nenhum módulo fora de `src/modules/tts/` importa `PiperProvider` diretamente (ver `quickstart.md` § User Story 2).

### Implementation for User Story 2

- [X] T007 [US2] Confirmar em `src/modules/tts/piperProvider.ts` que `NarrationResult.provider` resolvido é sempre `"piper"`, batendo com `PiperProvider.name` (FR-004) — confirmado pelo teste com binário falso: `provider: 'piper'`
- [X] T008 [P] [US2] Buscar no restante do repositório (`src/pipeline.ts`, `src/scripts/`) por imports diretos de `PiperProvider` fora do ponto de composição (injeção de dependência) e confirmar que o tipo usado nas assinaturas é `TtsProvider`, não `PiperProvider` (FR-005) — confirmado: `pipeline.ts` só importa o tipo `TtsProvider`; `PiperProvider` só é importado em `src/scripts/run-pipeline.ts` (ponto de composição)
- [X] T009 [US2] Validar manualmente seguindo `quickstart.md` § User Story 2

**Checkpoint**: Contrato plugável confirmado — pronto para a fase 04 implementar `ElevenLabsProvider` sem tocar em `ttsProvider.ts` (SC-003)

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Fechamento da fase

- [X] T010 Executar `quickstart.md` de ponta a ponta (US1 + US2) e confirmar todos os resultados esperados — 100% confirmado, incluindo síntese real com Piper + modelo pt-BR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 — BLOQUEIA as duas user stories
- **User Story 1 (Phase 3)**: Depende de Foundational (Phase 2) completa
- **User Story 2 (Phase 4)**: Depende de Foundational (Phase 2) completa; depende também de US1 estar corrigida (T003) para que `synthesize` de fato funcione durante a validação de T009
- **Polish (Phase 5)**: Depende de US1 e US2 completas

### User Story Dependencies

- **User Story 1 (P1)**: Sem dependência de outras stories
- **User Story 2 (P2)**: Depende de US1 estar implementada para ter uma síntese real a inspecionar — mas o contrato em si (T007–T008) pode ser revisado por leitura de código mesmo antes

### Parallel Opportunities

- T001 e T002 podem ser conferidos em paralelo (arquivos diferentes: `src/types.ts` vs `ttsProvider.ts`)
- T003–T006 (US1) tocam o mesmo arquivo (`piperProvider.ts`) — sequencial
- T008 pode rodar em paralelo com T007 (arquivos diferentes: busca no restante do repo vs leitura de `piperProvider.ts`)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational
3. Completar Phase 3: User Story 1 (inclui a correção do bug de stdin)
4. **PARAR e VALIDAR**: narração pt-BR gerada corretamente a partir de um texto real
5. Isso já é suficiente para alimentar a fase 05 (legendas) com áudio real

### Incremental Delivery

1. Setup + Foundational → contrato confirmado
2. US1 → corrigir e validar a síntese local → pipeline já tem narração funcional (MVP!)
3. US2 → confirmar que o contrato isola os consumidores da implementação → fase 04 pode começar sem risco de quebrar o que já funciona
4. Polish → `quickstart.md` validado ponta a ponta

---

## Notes

- T003–T005 fecham o gap identificado em `research.md` § Como alimentar o texto ao processo do Piper — sem essa correção, `synthesize` provavelmente não gera áudio correto hoje.
- Pré-processamento de texto (limpeza de markdown, quebra em blocos) permanece fora de escopo (spec.md § Assumptions) — nenhuma task aqui cobre isso.
