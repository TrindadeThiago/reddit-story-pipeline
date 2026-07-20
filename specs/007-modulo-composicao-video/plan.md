# Implementation Plan: Módulo de Composição de Vídeo (ffmpeg)

**Branch**: `007-modulo-composicao-video` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-modulo-composicao-video/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

`composeVideo(options)` usando `fluent-ffmpeg`: corta/escala o vídeo de
fundo para 1080x1920 (crop central), loopa o fundo se for mais curto que
a narração, embute a legenda via filtro `subtitles`, exporta em
H.264/AAC. Já implementado em `src/modules/video/composeVideo.ts` e,
diferente das fases anteriores, sem bug funcional claro no caminho feliz.
O ponto a reforçar é FR-006/US2: hoje não há checagem explícita de
existência dos três arquivos de entrada antes de rodar o ffmpeg — a
função depende do evento `error` do `fluent-ffmpeg` propagar uma mensagem
que identifique qual arquivo faltou, o que nem sempre é garantido (o
erro do ffmpeg pode ser genérico dependendo de qual etapa do pipeline
interno falha primeiro).

## Technical Context

**Language/Version**: TypeScript sobre Node.js (ES2022, NodeNext), mesma
base das fases anteriores.

**Primary Dependencies**: `fluent-ffmpeg` (já instalado na fase 001),
`node:fs` (para a checagem de existência de arquivo a adicionar).

**Storage**: Sistema de arquivos local — lê os três arquivos de entrada e
escreve o `.mp4` final em `options.outputPath`; nenhum estado persistido
pelo módulo em si.

**Testing**: Validação manual ponta a ponta com saída real das fases
03/04, 05 e 06, conforme `Tarefas técnicas` do spec original — sem
framework de teste automatizado nesta fase.

**Target Platform**: Ambiente de desenvolvimento local com o binário
ffmpeg instalado (pré-requisito da fase 001), com suporte a `libx264` e
ao filtro `subtitles`.

**Project Type**: Módulo de domínio dentro do single project
(`src/modules/video/`), estendendo o que a fase 06 já criou.

**Performance Goals**: Não crítico — composição roda uma vez por história
processada; tempo de execução do ffmpeg é aceitável sem meta específica
(pode levar dezenas de segundos dependendo da duração da narração).

**Constraints**: ffmpeg precisa suportar o filtro `subtitles` (depende de
ter sido compilado com `libass`) — pré-requisito de ambiente, não
verificado por este módulo.

**Scale/Scope**: Uma composição por chamada; sem processamento em lote
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
├── types.ts                       # ComposedVideo (compartilhado com fases 08/09)
└── modules/
    └── video/
        ├── backgroundVideoProvider.ts   # fase 06, inalterado
        └── composeVideo.ts               # composeVideo(options): Promise<ComposedVideo>
```

**Structure Decision**: Extensão do módulo `src/modules/video/` criado
na fase 06 — um arquivo já existente (`composeVideo.ts`), mesmo
diretório, sem pastas novas.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
