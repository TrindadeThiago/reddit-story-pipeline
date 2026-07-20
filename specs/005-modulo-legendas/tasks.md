---

description: "Task list template for feature implementation"
---

# Tasks: Módulo de Legendas (WhisperX)

**Input**: Design documents from `/specs/005-modulo-legendas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/generateCaptions.md, quickstart.md

**Tests**: Não solicitados na spec — validação via critérios de aceite manuais (`quickstart.md`), sem suíte automatizada nesta fase.

**Organization**: Tasks agrupadas por user story (US1: legenda sincronizada; US2: tolerância a trechos sem timestamp confiável).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 ou US2, conforme spec.md
- Caminhos de arquivo exatos incluídos em cada descrição

## Path Conventions

Single project — `scripts/transcribe.py`, `src/modules/captions/`, conforme `plan.md` § Project Structure.

**Contexto importante**: `scripts/transcribe.py` e `generateCaptions.ts`
já existem. O gap crítico está no formato de timestamp do `.srt` gerado
por `transcribe.py` — ver `research.md` § Formato de timestamp do `.srt`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar a base herdada das fases anteriores

- [X] T001 Confirmar que `src/modules/captions/`, `scripts/transcribe.py` existem e que `CaptionWord`/`CaptionResult` estão definidos em `src/types.ts` conforme `data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contrato de CLI do script Python, compartilhado pelas duas user stories

**⚠️ CRITICAL**: Nenhuma user story pode ser validada até esta fase estar completa

- [X] T002 Confirmar que `scripts/transcribe.py` aceita `--audio`, `--model`, `--out-srt`, `--out-json` e `--language` exatamente conforme `contracts/generateCaptions.md` § Contrato do script auxiliar

**Checkpoint**: Contrato de CLI estável — user stories podem ser implementadas/validadas

---

## Phase 3: User Story 1 - Gerar legenda sincronizada a partir da narração (Priority: P1) 🎯 MVP

**Goal**: `generateCaptions` produz um `.srt` válido (formato SubRip) e um `.words.json` com timestamps por palavra, a partir de um áudio de narração real.

**Independent Test**: Chamar `generateCaptions` com um áudio real e confirmar `.srt` válido + `.words.json` com timestamps plausíveis (ver `quickstart.md` § User Story 1).

### Implementation for User Story 1

- [X] T003 [US1] Corrigir em `scripts/transcribe.py` a formatação dos timestamps do `.srt`: substituir `f"{segment['start']:.3f} --> {segment['end']:.3f}"` por uma função que converte segundos para `HH:MM:SS,mmm` (padrão SubRip) antes de escrever cada bloco (FR-001; fecha o gap crítico de `research.md`) — validado isoladamente: `format_srt_timestamp(12.34) == "00:00:12,340"`, incluindo casos de borda (zero, hora cheia, arredondamento de ms)
- [X] T004 [US1] Confirmar em `scripts/transcribe.py` que o idioma `pt` é passado tanto para `load_model` quanto para `load_align_model`/`transcribe` (FR-003)
- [X] T005 [US1] Confirmar em `src/modules/captions/generateCaptions.ts` que o `CaptionResult` retornado tem `words` populado a partir de `${outputSrtPath}.words.json` e `srtFilePath === outputSrtPath` (FR-002, FR-005)
- [ ] T006 [US1] Validar manualmente com um áudio real (gerado pela fase 03 ou 04), seguindo `quickstart.md` § User Story 1: confirmar `.srt` válido, `.words.json` com timestamps, e conferência auditiva de 1–2 trechos — **BLOQUEADO neste ambiente**: WhisperX não está instalado no sandbox (`ModuleNotFoundError: No module named 'whisperx'`, confirmado na fase 001). Rodar numa máquina com WhisperX + modelo pt-BR instalados.

**Checkpoint**: Legenda sincronizada gerada corretamente e validada de forma independente (SC-001, SC-002)

---

## Phase 4: User Story 2 - Lidar com trechos de áudio sem timestamp confiável (Priority: P2)

**Goal**: Palavras sem timestamp confiável são descartadas sem interromper a geração da legenda.

**Independent Test**: Rodar `generateCaptions` sobre um áudio com trecho de ruído/silêncio e confirmar que o processo completa, com essas palavras simplesmente ausentes da lista (ver `quickstart.md` § User Story 2).

### Implementation for User Story 2

- [X] T007 [US2] Confirmar em `scripts/transcribe.py` que o filtro `if "start" not in word or "end" not in word: continue` está aplicado antes de adicionar a palavra à lista exportada em `--out-json` (FR-004)
- [ ] T008 [US2] Validar manualmente com um áudio contendo um trecho de ruído/silêncio, seguindo `quickstart.md` § User Story 2, confirmando que o processo completa e a legenda resultante é utilizável — **BLOQUEADO neste ambiente**: mesma limitação de T006 (WhisperX não instalado)

**Checkpoint**: Tolerância a trechos problemáticos confirmada de forma independente (SC-003)

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Fechamento da fase

- [ ] T009 Executar `quickstart.md` de ponta a ponta (US1 + US2) e confirmar todos os resultados esperados, incluindo que o `.srt` gerado é aceito sem modificação pela fase 07 quando ela existir (SC-004) — correção de formatação e código já confirmados; falta rodar com áudio real numa máquina com WhisperX instalado (T006/T008)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 — BLOQUEIA as duas user stories
- **User Story 1 (Phase 3)**: Depende de Foundational (Phase 2) completa
- **User Story 2 (Phase 4)**: Depende de Foundational (Phase 2) completa; independente de US1 em termos de spec, mas ambas tocam `scripts/transcribe.py` — recomenda-se sequencial
- **Polish (Phase 5)**: Depende de US1 e US2 completas

### User Story Dependencies

- **User Story 1 (P1)**: Sem dependência de outras stories
- **User Story 2 (P2)**: Funcionalmente independente de US1, mas compartilha `transcribe.py` — tratar como sequencial na prática

### Parallel Opportunities

- T001 e T002 podem ser conferidos em paralelo (arquivos diferentes)
- T003–T004 (US1, `transcribe.py`) e T005 (US1, `generateCaptions.ts`) podem rodar em paralelo — arquivos diferentes
- T007 (US2) toca o mesmo arquivo que T003–T004 — sequencial em relação a elas

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational
3. Completar Phase 3: User Story 1 (inclui a correção do formato de timestamp)
4. **PARAR e VALIDAR**: `.srt` válido gerado a partir de um áudio real
5. Isso já é suficiente para alimentar a fase 07 (composição de vídeo)

### Incremental Delivery

1. Setup + Foundational → contrato de CLI estável
2. US1 → corrigir formato do `.srt` e validar → legenda sincronizada funcional (MVP!)
3. US2 → confirmar tolerância a trechos ruins → geração em lote sobrevive a áudios imperfeitos
4. Polish → `quickstart.md` validado ponta a ponta

---

## Notes

- T003 fecha o gap crítico identificado em `research.md` — sem essa correção, o `.srt` gerado não é reconhecido como legenda válida pela maioria das ferramentas, incluindo o filtro `subtitles` do ffmpeg que a fase 07 vai usar.
- Estilização visual da legenda e tradução permanecem fora de escopo (spec.md § Assumptions) — nenhuma task aqui cobre isso.
