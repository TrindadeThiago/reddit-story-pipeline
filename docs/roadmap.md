# Roadmap e limitações conhecidas

Este é um esqueleto funcional na estrutura, não uma implementação 100%
pronta para produção. Esta página lista o que foi deliberadamente deixado
como `TODO`/backlog, e não bugs desconhecidos.

## Seleção/curadoria de histórias

Hoje `run-pipeline.ts` busca sempre no mesmo subreddit fixo
(`AskHistorians`), sem curadoria adicional além do filtro de
score/tamanho. Evoluções possíveis: lista de subreddits configurável,
dedupe entre execuções (hoje nada impede reprocessar a mesma história em
duas execuções), ranking por outros critérios além de `score`.

## Query do vídeo de fundo fixa

`backgroundQuery` é sempre a string literal `"pessoa organizando"`, tanto no
fluxo padrão quanto na regeneração — não deriva do conteúdo da história.
Marcado como `TODO` diretamente no código
(`src/scripts/run-pipeline.ts`, `src/scripts/regenerate-with-elevenlabs.ts`).

## Publicação automática nas plataformas

`publish.ts` move o job para `storage/published/` e para por aí — o upload
real para Instagram/TikTok/YouTube Shorts continua manual (você mesmo sobe
o `.mp4`). Deliberadamente fora de escopo por ora; detalhado em
[`specs/11-publicacao-plataformas-backlog.md`](../specs/11-publicacao-plataformas-backlog.md):

- Cada plataforma exige processo próprio de aprovação de app/API (mais burocrático que gerar vídeo).
- O fluxo atual já cobre a necessidade real definida: gerar + revisar manualmente.
- Pontos a decidir quando essa fase for priorizada: publicar nas 3 plataformas de uma vez ou por etapas; quem preenche legenda/hashtags (LLM a partir do título vs. manual); suporte a agendamento (varia por plataforma).

## Quando reconsiderar a fila baseada em filesystem

A fila de revisão (`storage/{pending-review,approved,published,discarded}`)
é pastas + `rename`, sem banco (ver
[architecture.md](./architecture.md#2-fila-de-revisão--filesystem-não-banco)).
Isso deixa de fazer sentido se: o volume de jobs por execução crescer muito
(centenas), for necessário revisar de mais de uma máquina/pessoa ao mesmo
tempo, ou for preciso consultar/filtrar jobs por metadado (ex: "todos os
jobs do subreddit X pendentes há mais de 3 dias") — nesse ponto, trocar por
SQLite + uma UI leve é a evolução natural já prevista.

## Validação ponta a ponta pendente

Boa parte do sistema foi validada com mocks/binários fake durante o
desenvolvimento, mas ainda depende de confirmação numa máquina com todas as
dependências reais (Reddit, Pexels, ElevenLabs, WhisperX com RAM
suficiente). Resumo do que já foi confirmado vs. o que falta em
[testing.md](./testing.md#validação-com-dependências-reais).

## Cobertura de testes automatizados

Só `fetchStories` tem testes hoje (ver [testing.md](./testing.md)). Os
demais módulos foram validados manualmente, sem regression test em CI —
qualquer alteração futura em `piperProvider`, `elevenLabsProvider`,
`quotaTracker`, `generateCaptions`, `buildHighlightedAss`,
`backgroundVideoProvider`, `composeVideo`, `reviewQueue` ou `pipeline` não
tem uma rede de segurança automatizada além do `tsc --noEmit`.

## Estado no Reddit sem `--input`

Não existe hoje um caminho "sem client_id" funcional para buscar histórias
reais no Reddit — o endpoint JSON público bloqueia tráfego automatizado com
403 independente da origem. A flag `--input`
(ver [cli.md](./cli.md#npm-run-generate----input-arquivojson)) é o caminho
recomendado quando OAuth não é uma opção no momento (testes locais, sem app
Reddit cadastrado ainda).
