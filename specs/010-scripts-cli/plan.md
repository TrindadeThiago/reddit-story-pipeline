# Implementation Plan: Scripts CLI (os 3 caminhos da revisão)

**Branch**: `010-scripts-cli` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-scripts-cli/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Quatro scripts já implementados em `src/scripts/`: `run-pipeline.ts`
(`npm run generate`), `publish.ts`, `regenerate-with-elevenlabs.ts` e
`discard.ts`. Diferente das fases 02–09, a leitura de código não revelou
um bug funcional — os três comandos de decisão já validam `jobId`
ausente com mensagem de uso clara, e `publish.ts` já encadeia
`moveToApproved` → `moveToPublished` corretamente (falhando com erro
claro na segunda execução, graças à correção da fase 09). O ponto a
reforçar é FR-006/edge case de configuração: os scripts leem variáveis de
ambiente obrigatórias via `process.env.X!` (non-null assertion), que só
falha em runtime dentro de uma chamada mais profunda (ex: dentro de
`PiperProvider`), com uma mensagem que não deixa claro qual variável de
ambiente está faltando.

## Technical Context

**Language/Version**: TypeScript sobre Node.js (ES2022, NodeNext),
executado via `tsx` (mesma base das fases anteriores).

**Primary Dependencies**: `dotenv/config` (carrega `.env`); reaproveita
`fetchStories` (fase 02), `PiperProvider`/`ElevenLabsProvider`/
`QuotaTracker` (fases 03/04), `runPipelineForStory` (fase 08),
`enqueueForReview`/`readPendingJob`/`moveToApproved`/`moveToPublished`/
`moveToDiscarded` (fase 09) — sem dependências npm novas.

**Storage**: N/A diretamente — os scripts são finos, delegando toda
persistência aos módulos das fases anteriores.

**Testing**: Validação manual do fluxo humano real (gerar → abrir pasta
→ assistir → escolher um dos 3 comandos), conforme `Tarefas técnicas` do
spec original — sem framework de teste automatizado nesta fase.

**Target Platform**: Terminal local, invocado via `npm run <script> --
<args>`; depende de todo o ambiente das fases 001–009 estar configurado
(ffmpeg, Piper, WhisperX, credenciais).

**Project Type**: Scripts de ponta a ponta (`src/scripts/`) dentro do
single project — não expõem função reutilizável, cada um lê
`process.argv` diretamente.

**Performance Goals**: Não crítico — disparados manualmente, um por vez.

**Constraints**: Cada script depende de variáveis de ambiente específicas
(`PIPER_MODEL_PATH`, `PEXELS_API_KEY`, `ELEVENLABS_API_KEY`,
`ELEVENLABS_VOICE_ID`, etc.) já documentadas em `.env.example` (fase
001).

**Scale/Scope**: Quatro scripts, cada um com uma responsabilidade única;
sem lógica compartilhada além dos módulos já existentes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` ainda não foi preenchido para este
projeto (placeholders não substituídos) — não há princípios ratificados
para verificar. Gate tratado como **PASS por ausência de constraints**;
nenhuma violação a registrar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
└── scripts/
    ├── run-pipeline.ts                 # npm run generate
    ├── publish.ts                       # npm run publish -- <jobId>
    ├── regenerate-with-elevenlabs.ts    # npm run regenerate:elevenlabs -- <jobId>
    └── discard.ts                       # npm run discard -- <jobId>
```

**Structure Decision**: Nenhuma pasta nova — os quatro scripts já
existem em `src/scripts/` (fase 001) e recebem apenas ajustes internos
(validação de variáveis de ambiente).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
