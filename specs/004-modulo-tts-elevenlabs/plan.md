# Implementation Plan: Módulo TTS — ElevenLabs + controle de cota

**Branch**: `004-modulo-tts-elevenlabs` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-modulo-tts-elevenlabs/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

`ElevenLabsProvider implements TtsProvider` (mesmo contrato da fase 03),
usado só no caminho de regeneração pós-revisão, e `QuotaTracker`, que
guarda em JSON local quantos caracteres já foram usados no mês corrente e
bloqueia a chamada antes de estourar o limite configurado. Ambos já estão
implementados em `src/modules/tts/{elevenLabsProvider,quotaTracker}.ts`,
mas há um bug crítico: `assertHasBudget` (async) é chamado sem `await` em
`elevenLabsProvider.ts`, então a checagem de cota não bloqueia
efetivamente a chamada à API antes dela ser feita — viola FR-003/FR-004 e
SC-002 diretamente. `recordUsage` tem o mesmo problema, com impacto menor
(risco de perder o registro de uso se o processo terminar antes da
gravação em disco completar).

## Technical Context

**Language/Version**: TypeScript sobre Node.js (ES2022, NodeNext), mesma
base das fases anteriores.

**Primary Dependencies**: `fetch` nativo do Node (API do ElevenLabs);
`node:fs/promises` para o estado da cota em JSON local — sem dependências
npm novas.

**Storage**: Arquivo JSON local (`storage/elevenlabs-quota.json`,
caminho configurável via `QuotaTracker`) guardando `{ yearMonth,
charactersUsed }` — único estado persistido por este módulo.

**Testing**: Validação manual, incluindo bloqueio proposital de cota
(setar limite baixo e tentar estourar), conforme `Tarefas técnicas` do
spec original — sem framework de teste automatizado nesta fase.

**Target Platform**: Mesma CLI/pipeline batch local, com acesso de rede
de saída para `api.elevenlabs.io`.

**Project Type**: Módulo de domínio dentro do single project
(`src/modules/tts/`), estendendo o que a fase 03 já criou.

**Performance Goals**: Não crítico — usado sob demanda, no caminho de
regeneração (não em lote); latência da API do ElevenLabs é aceitável sem
meta específica.

**Constraints**: Requer `ELEVENLABS_API_KEY` e `ELEVENLABS_VOICE_ID`
válidos (fase 001); `ELEVENLABS_MONTHLY_CHAR_LIMIT` define o teto do
plano gratuito a respeitar.

**Scale/Scope**: Volume baixo por natureza — só histórias que passaram
por revisão manual e tiveram a narração local rejeitada.

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
├── types.ts                          # NarrationResult (ja compartilhado desde a fase 03)
└── modules/
    └── tts/
        ├── ttsProvider.ts              # contrato (fase 03, inalterado)
        ├── piperProvider.ts            # fase 03, inalterado
        ├── elevenLabsProvider.ts       # class ElevenLabsProvider implements TtsProvider
        └── quotaTracker.ts             # class QuotaTracker

storage/
└── elevenlabs-quota.json               # estado persistido do QuotaTracker
```

**Structure Decision**: Extensão do módulo `src/modules/tts/` criado na
fase 03 — dois arquivos novos, mesmo diretório, contrato `TtsProvider`
inalterado.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
