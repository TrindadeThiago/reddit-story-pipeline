# Documentação — reddit-story-pipeline

Documentação técnica completa do projeto. O [README.md](../README.md) na raiz
é o quickstart; aqui vai o detalhamento de arquitetura, módulos, dados,
operação e decisões de design.

- [Arquitetura](./architecture.md) — visão de sistema, princípios de design, diagramas de fluxo e sequência, estratégia de tratamento de erro.
- [Módulos](./modules.md) — referência de cada arquivo em `src/`: responsabilidade, API pública, comportamento interno, edge cases.
- [Modelo de dados](./data-model.md) — tipos (`src/types.ts`), ciclo de vida do `PipelineJob`, formato de `job.json`.
- [Ambiente e dependências](./environment.md) — variáveis de ambiente, dependências externas (ffmpeg, Piper, WhisperX, Pexels, ElevenLabs, Reddit), setup.
- [CLI](./cli.md) — referência de cada comando (`generate`, `publish`, `discard`, `regenerate:elevenlabs`, `download:background-pack`, `index:background-pack`).
- [Legendas com destaque de palavra](./captions-highlight.md) — como o `.ass` com highlight é gerado e como customizar.
- [Testes](./testing.md) — estratégia de teste, cobertura atual, checklist de validação com dependências reais.
- [Roadmap e limitações conhecidas](./roadmap.md) — o que é `TODO` deliberado e o que falta validar.

## Origem do projeto

O desenvolvimento seguiu o formato spec-driven (spec-kit): cada fase tem uma
spec própria em [`specs/NNN-nome-da-fase/`](../specs/). Esses documentos são
o histórico de decisão de cada fase (`spec.md`, `plan.md`, `research.md`,
`data-model.md`, `tasks.md`, `quickstart.md`); esta pasta `docs/` é a
referência consolidada e atualizada do estado atual do sistema — quando os
dois divergirem, `docs/` reflete o código como ele é hoje.
