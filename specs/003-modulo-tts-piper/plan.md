# Implementation Plan: Módulo TTS — Piper + interface plugável

**Branch**: `003-modulo-tts-piper` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-modulo-tts-piper/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

`PiperProvider implements TtsProvider`, que sintetiza narração em áudio
pt-BR via o binário Piper local, e o contrato `TtsProvider` que a fase 04
(ElevenLabs) também vai implementar. Uma implementação inicial já existe
em `src/modules/tts/piperProvider.ts` e `src/modules/tts/ttsProvider.ts`,
mas o código tem um `TODO` explícito sinalizando que a forma como o texto
é passado ao processo do Piper (`execFile` com uma opção `input` via
cast `as any`) provavelmente não funciona — `execFile` assíncrono do
Node não tem opção `input` para alimentar stdin do subprocesso; isso
existe apenas nas variantes síncronas (`execFileSync`). Esta fase de
planejamento cobre a correção desse ponto antes de validar SC-001.

## Technical Context

**Language/Version**: TypeScript sobre Node.js (ES2022, NodeNext), mesma
base das fases 001/002.

**Primary Dependencies**: `node:child_process` (spawn do binário Piper
como subprocesso) — sem dependências npm novas.

**Storage**: Sistema de arquivos local — o áudio gerado é escrito no
`outputPath` informado pelo chamador; nenhum estado persistido pelo
próprio módulo.

**Testing**: Validação manual com texto real (2000+ caracteres), conforme
`Tarefas técnicas` do spec original — sem framework de teste automatizado
definido nesta fase.

**Target Platform**: Ambiente de desenvolvimento local com o binário
Piper instalado (pré-requisito da fase 001) — mesma CLI/pipeline batch.

**Project Type**: Módulo de domínio dentro do single project
(`src/modules/tts/`).

**Performance Goals**: Não crítico — síntese roda uma vez por história
processada, sem meta de latência definida; aceitável levar alguns
segundos por narração no volume esperado.

**Constraints**: O binário Piper precisa estar disponível no `PATH` (ou
endereçável via caminho configurado) e o modelo de voz pt-BR precisa
existir no caminho apontado por `PIPER_MODEL_PATH` (variável definida na
fase 001).

**Scale/Scope**: Um texto por chamada (uma história inteira do Reddit,
tipicamente alguns milhares de caracteres); sem processamento em lote
dentro do próprio módulo.

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
├── types.ts                       # NarrationResult (compartilhado com todo o pipeline)
└── modules/
    └── tts/
        ├── ttsProvider.ts          # interface TtsProvider (contrato fixo)
        └── piperProvider.ts        # class PiperProvider implements TtsProvider
```

**Structure Decision**: Módulo único dentro da estrutura fixa da fase
001 (`src/modules/tts/`). `ttsProvider.ts` guarda só o contrato — a fase
04 adiciona `elevenLabsProvider.ts` e `quotaTracker.ts` no mesmo
diretório, sem alterar `ttsProvider.ts`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
