# Implementation Plan: Setup do Projeto

**Branch**: `001-setup-projeto` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-setup-projeto/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Criar o esqueleto do projeto Node/TypeScript (manifesto de dependências,
configuração de build, estrutura de pastas, variáveis de ambiente de
exemplo e documentação de dependências externas) que servirá de base fixa
para todos os módulos das fases 02–10 do pipeline de geração de vídeos.
Não há lógica de negócio nesta fase — o critério de sucesso é um ambiente
instalável, tipado e navegável, pronto para receber código.

## Technical Context

**Language/Version**: TypeScript sobre Node.js (target ES2022, module
NodeNext), executado via `tsx` sem passo de build separado durante o
desenvolvimento.

**Primary Dependencies**: `dotenv` (variáveis de ambiente), `fluent-ffmpeg`
(orquestração de ffmpeg, usado a partir da fase 07), `node-fetch` (HTTP
para Reddit/Pexels/ElevenLabs), `typescript` + `@types/node` (tipagem),
`tsx` (execução direta de TS).

**Storage**: Sistema de arquivos local — diretórios `storage/{pending-review,approved,published,discarded}` como fila de estados; nenhum banco de dados nesta fase.

**Testing**: Validação manual dos critérios de aceite (instalação, type-check, verificação de binários externos); sem framework de testes automatizados definido nesta fase — cada módulo decide sua própria estratégia de teste quando implementado.

**Target Platform**: Ambiente de desenvolvimento local (Linux/WSL), execução via linha de comando.

**Project Type**: CLI / pipeline batch de single project (sem frontend/backend separados).

**Performance Goals**: N/A nesta fase (sem lógica de execução) — apenas velocidade de setup (ver SC-001: ambiente pronto em <15min).

**Constraints**: Dependências externas (ffmpeg, Piper, WhisperX) são instaladas manualmente fora do gerenciador de pacotes do Node; devem ser documentadas, não automatizadas.

**Scale/Scope**: Escopo pequeno e fixo — 1 manifesto, 1 config de TS, 1 arquivo de exemplo de env, ~10 diretórios. Não cresce com o volume de vídeos processados.

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
package.json            # scripts: generate, publish, discard, regenerate:elevenlabs
tsconfig.json            # ES2022, NodeNext, strict
.env.example             # todas as variáveis: Reddit, ElevenLabs, Piper, Pexels, Whisper

src/
├── modules/
│   ├── reddit/          # fase 02
│   ├── tts/              # fases 03-04
│   ├── captions/         # fase 05
│   ├── video/             # fases 06-07
│   └── review/            # fase 09
├── scripts/               # fase 10 (run-pipeline, publish, discard, regenerate-with-elevenlabs)
└── pipeline.ts             # fase 08 (orquestrador)

storage/
├── pending-review/.gitkeep
├── approved/.gitkeep
├── published/.gitkeep
└── discarded/.gitkeep
```

**Structure Decision**: Single project (CLI/pipeline batch), sem
separação frontend/backend. A estrutura acima é a base fixa referenciada
por FR-004; as fases 02–10 só adicionam arquivos dentro dela, sem criar
novas pastas de primeiro nível (SC-004).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
