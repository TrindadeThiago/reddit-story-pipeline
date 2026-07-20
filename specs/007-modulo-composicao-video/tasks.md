---

description: "Task list template for feature implementation"
---

# Tasks: Módulo de Composição de Vídeo (ffmpeg)

**Input**: Design documents from `/specs/007-modulo-composicao-video/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/composeVideo.md, quickstart.md

**Tests**: Não solicitados na spec — validação via critérios de aceite manuais (`quickstart.md`), sem suíte automatizada nesta fase.

**Organization**: Tasks agrupadas por user story (US1: montagem do vídeo final; US2: erro claro por arquivo ausente).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 ou US2, conforme spec.md
- Caminhos de arquivo exatos incluídos em cada descrição

## Path Conventions

Single project — `src/modules/video/`, conforme `plan.md` § Project Structure.

**Contexto importante**: `composeVideo` já existe e o caminho feliz (crop
central, loop de fundo, `-shortest`, legenda embutida, H.264/AAC) já
funciona corretamente. O único ajuste necessário é FR-006/US2 — ver
`research.md` § Checagem explícita de arquivos de entrada.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar a base herdada das fases 001/006

- [X] T001 Confirmar que `src/modules/video/composeVideo.ts` existe e expõe `composeVideo(options)` conforme `contracts/composeVideo.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Nenhum pré-requisito bloqueante adicional além da função já existir

**⚠️ CRITICAL**: Nenhuma user story pode ser validada até esta fase estar completa

- [X] T002 Confirmar que `ComposeOptions` em `src/modules/video/composeVideo.ts` tem os quatro campos (`narrationAudioPath`, `backgroundVideoPath`, `srtCaptionsPath`, `outputPath`) conforme `data-model.md`

**Checkpoint**: Assinatura de `composeVideo` estável — user stories podem ser implementadas/validadas

---

## Phase 3: User Story 1 - Montar o vídeo final a partir da narração, fundo e legenda (Priority: P1) 🎯 MVP

**Goal**: `composeVideo` produz um `.mp4` 1080x1920 com duração igual à narração e legenda sincronizada embutida.

**Independent Test**: Chamar `composeVideo` com insumos reais das fases 03/04, 05 e 06, e confirmar `.mp4` válido, retrato, com duração e legenda corretas (ver `quickstart.md` § User Story 1).

### Implementation for User Story 1

- [X] T003 [US1] Confirmar em `composeVideo.ts` que o filtro `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920` produz saída em formato retrato sem distorção (FR-002)
- [X] T004 [US1] Confirmar em `composeVideo.ts` que `-stream_loop -1` no vídeo de fundo combinado com `-shortest` na saída resulta na duração do vídeo final sempre igual à duração da narração, tanto quando o fundo é mais curto quanto mais longo (FR-003)
- [X] T005 [US1] Confirmar em `composeVideo.ts` que o filtro `subtitles=${srtCaptionsPath}` está encadeado corretamente após o crop (`[bg]subtitles=...[final]`), garantindo legenda embutida no vídeo final (FR-004)
- [ ] T006 [US1] Validar manualmente ponta a ponta com áudio real (fase 03/04), vídeo de fundo real (fase 06) e legenda real (fase 05), seguindo `quickstart.md` § User Story 1: confirmar formato retrato, duração, legenda sincronizada e ausência de dessincronia perceptível (FR-005) — **BLOQUEADO neste ambiente**: ffmpeg não está instalado no sandbox (confirmado desde a fase 001). Rodar numa máquina com ffmpeg instalado (suporte a `libx264` e filtro `subtitles`).

**Checkpoint**: Montagem do vídeo final funcional e validada de forma independente (SC-001, SC-002, SC-003)

---

## Phase 4: User Story 2 - Saber exatamente o que faltou quando a composição falha (Priority: P2)

**Goal**: Qualquer um dos três arquivos de entrada ausente resulta em erro que identifica especificamente qual arquivo está faltando.

**Independent Test**: Chamar `composeVideo` com um caminho de entrada inexistente por vez e confirmar que o erro identifica qual arquivo faltou (ver `quickstart.md` § User Story 2).

### Implementation for User Story 2

- [X] T007 [US2] Adicionar em `composeVideo.ts`, antes de construir o pipeline `ffmpeg()`, uma checagem de existência (`fs.existsSync` ou equivalente assíncrono) para `narrationAudioPath`, `backgroundVideoPath` e `srtCaptionsPath`, rejeitando a promise com uma mensagem que identifica qual caminho específico não foi encontrado (FR-006; fecha o gap de `research.md`)
- [X] T008 [US2] Validar manualmente apontando cada um dos três campos de `ComposeOptions`, um de cada vez, para um caminho inexistente, seguindo `quickstart.md` § User Story 2, confirmando que o erro identifica corretamente qual arquivo está faltando em cada caso — validado com arquivos temporários: cada um dos 3 campos gerou erro identificando corretamente o campo e o caminho ausente, sem sequer chegar a invocar o ffmpeg

**Checkpoint**: Erros claros e identificáveis para os três arquivos de entrada, validado de forma independente (SC-004)

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Fechamento da fase

- [ ] T009 Executar `quickstart.md` de ponta a ponta (US1 + US2) e confirmar todos os resultados esperados — US2 100% confirmada; falta rodar US1 numa máquina com ffmpeg instalado (T006)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 — BLOQUEIA as duas user stories
- **User Story 1 (Phase 3)**: Depende de Foundational (Phase 2) completa
- **User Story 2 (Phase 4)**: Depende de Foundational (Phase 2) completa; independente de US1 em termos de spec, mas ambas tocam `composeVideo.ts` — recomenda-se sequencial (T007 insere código no início da função, antes do que US1 já valida)
- **Polish (Phase 5)**: Depende de US1 e US2 completas

### User Story Dependencies

- **User Story 1 (P1)**: Sem dependência de outras stories
- **User Story 2 (P2)**: Funcionalmente independente de US1, mas compartilha o arquivo-fonte — tratar como sequencial na prática

### Parallel Opportunities

- T001 e T002 podem ser conferidos em paralelo
- T003–T005 (US1) podem ser conferidas em paralelo entre si (trechos diferentes do mesmo pipeline de filtros, leitura apenas) antes de T006 (validação ponta a ponta)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational
3. Completar Phase 3: User Story 1
4. **PARAR e VALIDAR**: vídeo final gerado corretamente a partir de insumos reais
5. Isso já é suficiente para alimentar a fase 09 (fila de revisão) no caminho feliz

### Incremental Delivery

1. Setup + Foundational → assinatura confirmada
2. US1 → validar a montagem em si → vídeo final pronto para revisão (MVP!)
3. US2 → adicionar checagem explícita de arquivos → falhas de composição ficam diagnosticáveis rapidamente
4. Polish → `quickstart.md` validado ponta a ponta

---

## Notes

- T007 fecha o gap identificado em `research.md` — reforça FR-006 com uma checagem determinística, em vez de depender só do erro bruto do ffmpeg.
- Estilo de legenda avançado (ASS customizado), marca d'água e transições permanecem fora de escopo (spec.md § Assumptions) — nenhuma task aqui cobre isso.
