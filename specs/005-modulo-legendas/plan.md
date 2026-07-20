# Implementation Plan: Módulo de Legendas (WhisperX)

**Branch**: `005-modulo-legendas` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-modulo-legendas/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

`scripts/transcribe.py` (WhisperX: transcrição + forced alignment via
wav2vec2) gera `.srt` + `.words.json`; `generateCaptions(audioFilePath,
outputSrtPath, modelSize)` chama o script via subprocess e lê o
`.words.json` resultante. Ambos já existem em `scripts/transcribe.py` e
`src/modules/captions/generateCaptions.ts`, mas o `.srt` gerado usa
timestamps em segundos brutos (`12.340 --> 15.670`) em vez do formato
`HH:MM:SS,mmm` exigido pelo padrão SRT — isso quebra FR-001/SC-001
(legenda "válida, abrível por ferramentas padrão") e provavelmente
quebraria o filtro `subtitles` do ffmpeg na fase 07. Esta fase de
planejamento cobre a correção da formatação de timestamp antes de validar
o critério de aceite.

## Technical Context

**Language/Version**: TypeScript (Node.js, ES2022/NodeNext) para o
wrapper `generateCaptions`; Python 3 para `scripts/transcribe.py`
(mesma combinação já usada no restante do pipeline).

**Primary Dependencies**: `whisperx` (pip, instalado na fase 001) —
transcrição + forced alignment; `node:child_process` para invocar o
script Python a partir do TypeScript.

**Storage**: Sistema de arquivos local — `.srt` e `.words.json` escritos
ao lado do caminho de saída informado pelo chamador; nenhum estado
persistido pelo módulo em si.

**Testing**: Validação manual com áudio real (gerado pelas fases 03/04) e
checagem auditiva de 1–2 exemplos, conforme `Tarefas técnicas` do spec
original — sem framework de teste automatizado nesta fase.

**Target Platform**: Ambiente de desenvolvimento local com WhisperX e o
modelo de alinhamento em português já baixados (pré-requisito da fase
001).

**Project Type**: Módulo de domínio (`src/modules/captions/`) + script
auxiliar Python (`scripts/transcribe.py`) dentro do single project.

**Performance Goals**: Não crítico — transcrição roda uma vez por
história processada; WhisperX em CPU (`compute_type="int8"`) já é a
escolha default do script, aceitável para o volume de uso pessoal.

**Constraints**: O modelo de alinhamento em português precisa estar
disponível localmente (baixado na primeira execução, conforme spec
original); `generateCaptions` assume que o processo Node roda com o
diretório de trabalho na raiz do repositório (caminho relativo
`scripts/transcribe.py`).

**Scale/Scope**: Um áudio por chamada; sem processamento em lote dentro
do próprio módulo.

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
scripts/
└── transcribe.py                      # WhisperX: transcricao + forced alignment -> .srt + .words.json

src/
├── types.ts                           # CaptionWord, CaptionResult (compartilhados com a fase 07)
└── modules/
    └── captions/
        └── generateCaptions.ts         # wrapper TS que chama transcribe.py via subprocess
```

**Structure Decision**: Módulo único dentro da estrutura fixa da fase
001 (`src/modules/captions/`), mais o script Python já previsto em
`scripts/`. Sem pastas novas.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
