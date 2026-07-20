# Research: Setup do Projeto

Não há marcadores `NEEDS CLARIFICATION` no Technical Context — as decisões
abaixo já eram determinadas pela spec original das fases (`specs/01-setup-projeto.md`) e pelas dependências que as fases 02–07 vão exigir.

## Decisão: Runtime e execução

- **Decision**: TypeScript executado diretamente via `tsx`, sem etapa de
  build/transpilação separada durante o desenvolvimento.
- **Rationale**: Pipeline batch de uso pessoal/pequena escala, disparado
  manualmente pelo terminal — não há necessidade de artefato de build
  distribuível. `tsx` reduz fricção (sem `tsc --build` antes de cada
  execução).
- **Alternatives considered**: `ts-node` (mais lento, exige config extra
  para ESM/NodeNext); compilar com `tsc` e rodar `.js` (adiciona um passo
  manual sem benefício, já que não há deploy nesta fase).

## Decisão: Módulo e target TS

- **Decision**: `module: NodeNext`, `target: ES2022`, `strict: true`.
- **Rationale**: `NodeNext` alinha resolução de módulos com Node.js
  moderno (evita armadilhas de ESM/CJS); `strict` detecta erros de tipo
  cedo, importante já que módulos futuros (fases 02–09) vão trocar dados
  estruturados (`RedditStory`, `PipelineJob`) entre si via contratos de
  interface fixos.
- **Alternatives considered**: `CommonJS` — descartado por ser o padrão
  legado, sem vantagem aqui e pior interoperabilidade com libs modernas.

## Decisão: Dependências externas fora do npm

- **Decision**: ffmpeg, Piper (binário + modelo pt-BR) e WhisperX
  (`pip install whisperx`) são pré-requisitos documentados, não
  gerenciados pelo `package.json`.
- **Rationale**: São ferramentas de sistema/Python, fora do ecossistema
  Node; tentar empacotá-las via npm adicionaria complexidade
  desproporcional para um pipeline de uso local.
- **Alternatives considered**: Containerizar tudo (Docker) — descartado
  porque CI/CD e deploy estão explicitamente fora de escopo desta fase
  (ver Assumptions no spec.md).

## Decisão: Estrutura de pastas por domínio

- **Decision**: `src/modules/{reddit,tts,captions,video,review}` +
  `src/scripts` + `storage/{pending-review,approved,published,discarded}`.
- **Rationale**: Espelha diretamente as fases 02–10 do roadmap
  (`specs/00-overview.md`), então cada fase futura sabe exatamente onde
  seu código entra sem precisar renegociar estrutura.
- **Alternatives considered**: Estrutura por tipo técnico
  (`controllers/`, `services/`) — descartado por não refletir os
  domínios de negócio (Reddit, TTS, legendas, vídeo) que a spec do
  produto usa como unidade de fase.
