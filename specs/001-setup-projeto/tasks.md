---

description: "Task list template for feature implementation"
---

# Tasks: Setup do Projeto

**Input**: Design documents from `/specs/001-setup-projeto/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Não solicitados na spec — esta fase é validada via critérios de aceite manuais (instalação, type-check, verificação de binários), não por suíte de testes automatizada.

**Organization**: Tasks agrupadas por user story (US1: ambiente pronto; US2: variáveis de ambiente e dependências externas documentadas).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 ou US2, conforme spec.md
- Caminhos de arquivo exatos incluídos em cada descrição

## Path Conventions

Single project — `src/`, `storage/` na raiz do repositório, conforme `plan.md` § Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Esqueleto de pastas do repositório

- [X] T001 Criar árvore de diretórios `src/modules/{reddit,tts,captions,video,review}`, `src/scripts` e `storage/{pending-review,approved,published,discarded}` conforme `plan.md` § Project Structure
- [X] T002 [P] Adicionar `.gitkeep` em cada pasta de `storage/{pending-review,approved,published,discarded}/.gitkeep` para versionar as pastas vazias

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Configuração de build/dependências que bloqueia a validação de ambas as user stories

**⚠️ CRITICAL**: Nenhuma user story pode ser validada até esta fase estar completa

- [X] T003 Criar `package.json` na raiz com scripts `generate`, `publish`, `discard`, `regenerate:elevenlabs` e dependências `dotenv`, `fluent-ffmpeg`, `node-fetch`, `typescript`, `tsx`, `@types/node`
- [X] T004 Criar `tsconfig.json` na raiz com `target: ES2022`, `module: NodeNext`, `strict: true`

**Checkpoint**: `npm install` instalável e `tsconfig.json` válido — user stories podem ser validadas

---

## Phase 3: User Story 1 - Preparar ambiente de desenvolvimento do zero (Priority: P1) 🎯 MVP

**Goal**: Clonar o repositório, instalar dependências e confirmar que a base do projeto (config + estrutura de pastas) funciona sem nenhuma lógica de negócio implementada.

**Independent Test**: Clonar o repo, rodar a instalação de dependências e a checagem de tipos, e inspecionar a árvore de pastas — tudo deve funcionar sem depender de nenhuma fase de negócio (02+).

### Implementation for User Story 1

- [X] T005 [US1] Rodar a instalação de dependências (`npm install`) a partir do `package.json` (T003) e confirmar conclusão sem erros
- [X] T006 [US1] Rodar a checagem de tipos (`npx tsc --noEmit`) usando o `tsconfig.json` (T004) e confirmar conclusão sem erros
- [X] T007 [US1] Conferir a árvore de diretórios criada em T001 contra a tabela "Estrutura do projeto" em `data-model.md` e confirmar que todas as pastas de módulo e de storage existem

**Checkpoint**: Ambiente de desenvolvimento pronto e verificável de forma independente (SC-001)

---

## Phase 4: User Story 2 - Descobrir variáveis de ambiente e dependências externas (Priority: P2)

**Goal**: Um arquivo `.env.example` completo e um roteiro de instalação das ferramentas externas, para que nenhuma fase futura precise voltar e adicionar isso aos poucos.

**Independent Test**: Comparar `.env.example` com a tabela de variáveis por fase em `data-model.md`, e confirmar que as ferramentas externas documentadas respondem a uma verificação básica após seguir as instruções.

### Implementation for User Story 2

- [X] T008 [P] [US2] Criar `.env.example` na raiz com as variáveis do grupo Reddit (User-Agent, subreddits) — fase 02
- [X] T009 [P] [US2] Adicionar ao `.env.example` as variáveis do grupo Piper (caminho do binário, modelo de voz pt-BR) — fase 03
- [X] T010 [P] [US2] Adicionar ao `.env.example` as variáveis do grupo ElevenLabs (API key, voice id, `ELEVENLABS_MONTHLY_CHAR_LIMIT`) — fase 04
- [X] T011 [P] [US2] Adicionar ao `.env.example` as variáveis do grupo Pexels (API key) — fase 06
- [X] T012 [P] [US2] Adicionar ao `.env.example` as variáveis do grupo Whisper/WhisperX (tamanho do modelo) — fase 05
- [X] T013 [US2] Documentar em `README.md` os passos de instalação manual do ffmpeg, do binário Piper + modelo pt-BR, e do WhisperX (`pip install whisperx`) (depende de T008–T012 para referenciar as mesmas variáveis)
- [X] T014 [US2] Verificar `ffmpeg -version`, `piper --help` e `python3 -c "import whisperx"` executando sem erro após seguir a documentação de T013 — `ffmpeg -version` ✓ (já instalado, com libx264 e filtro subtitles); `piper --help` ✓ (instalado em `~/.local/bin`, modelo pt-BR baixado); `import whisperx` ✓ (instalado em venv isolado `.venv-whisperx/`, criado para não poluir o ambiente Python global da máquina)

**Checkpoint**: Variáveis de ambiente e dependências externas documentadas e verificáveis de forma independente (SC-002, SC-003)

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Fechamento da fase de setup

- [X] T015 [P] Adicionar ao `README.md` uma seção de visão geral do projeto e link para `specs/00-overview.md`
- [X] T016 Executar `quickstart.md` de ponta a ponta (US1 + US2) e confirmar todos os resultados esperados — todas as ferramentas externas confirmadas (T014). Observação: WhisperX precisou de venv isolado por causa do tamanho das dependências (torch/pyannote), e a máquina de teste (3.8GB RAM) não tem memória suficiente para rodar uma transcrição real sem OOM — isso é limite de hardware, não da instalação em si (import funciona, binário existe)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 (estrutura de pastas já existente para receber `package.json`/`tsconfig.json` na raiz) — BLOQUEIA as duas user stories
- **User Story 1 (Phase 3)**: Depende de Foundational (Phase 2) completa
- **User Story 2 (Phase 4)**: Depende de Foundational (Phase 2) completa; independente de US1 (pode rodar em paralelo)
- **Polish (Phase 5)**: Depende de US1 e US2 completas

### User Story Dependencies

- **User Story 1 (P1)**: Sem dependência de outras stories
- **User Story 2 (P2)**: Sem dependência de US1 — pode ser feita em paralelo, mas é priorizada depois por impacto (P1 > P2)

### Parallel Opportunities

- T002 pode rodar em paralelo com o restante da Phase 1
- T008–T012 (grupos de variáveis no `.env.example`) podem ser feitos em paralelo antes de consolidar em T013
- Phase 3 (US1) e Phase 4 (US2) podem ser executadas em paralelo por pessoas diferentes, ambas após o Checkpoint da Phase 2

---

## Parallel Example: User Story 2

```bash
# Adicionar os grupos de variáveis em paralelo (arquivo compartilhado, mas seções independentes):
Task: "Adicionar variáveis Reddit ao .env.example"
Task: "Adicionar variáveis Piper ao .env.example"
Task: "Adicionar variáveis ElevenLabs ao .env.example"
Task: "Adicionar variáveis Pexels ao .env.example"
Task: "Adicionar variáveis Whisper/WhisperX ao .env.example"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (bloqueia as duas stories)
3. Completar Phase 3: User Story 1
4. **PARAR e VALIDAR**: ambiente instala e tipa sem erro, estrutura de pastas confere
5. Isso já é suficiente para começar a implementar a fase 02 (Módulo Reddit)

### Incremental Delivery

1. Setup + Foundational → base pronta
2. US1 → validar independentemente → ambiente pronto para receber código (MVP!)
3. US2 → validar independentemente → nenhuma fase futura vai precisar voltar para adicionar variável de ambiente esquecida
4. Polish → README completo e quickstart validado ponta a ponta

---

## Notes

- Nenhuma task desta fase envolve lógica de negócio — apenas configuração, estrutura e documentação (ver Fora de Escopo em `specs/01-setup-projeto.md`).
- SC-004 ("nenhuma fase 02–10 cria pastas de primeiro nível novas") só pode ser confirmado retroativamente, após essas fases serem implementadas — não há task correspondente aqui.
