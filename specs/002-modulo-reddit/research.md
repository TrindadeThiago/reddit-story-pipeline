# Research: Módulo Reddit (busca de histórias)

Sem marcadores `NEEDS CLARIFICATION` no Technical Context. Decisões abaixo
consolidam o que já está implementado em
`src/modules/reddit/fetchStories.ts` e o que falta para cobrir US2.

## Decisão: Endpoint público sem autenticação

- **Decision**: Usar `https://www.reddit.com/r/<subreddit>/top.json`
  (sem OAuth/PRAW).
- **Rationale**: Volume de uso é baixo (uso pessoal, poucos vídeos por
  dia); o endpoint público atende sem o overhead de registrar um app e
  gerenciar tokens.
- **Alternatives considered**: PRAW/snoowrap com OAuth — descartado por
  ora (ver spec § Fora de escopo); vira necessário só se o volume exigir
  mais do que o limite do acesso público sem auth.

## Decisão: Isolamento de falha por subreddit (US2 — gap a fechar)

- **Decision**: Envolver a busca de cada subreddit individualmente em
  tratamento de erro, coletando falhas parciais sem abortar a chamada
  inteira; retornar/logar identificação clara de qual subreddit falhou e
  por quê.
- **Rationale**: A implementação atual (`fetchStories.ts`) faz `await
  fetch(...)` e `await res.json()` diretamente dentro do loop, sem
  `try/catch` — uma falha de rede ou um subreddit inexistente (resposta
  não-JSON ou 404) hoje propaga uma exceção não tratada e interrompe a
  busca dos subreddits seguintes na mesma chamada. Isso viola FR-007 e a
  User Story 2 do spec.
- **Alternatives considered**: Deixar o chamador (orquestrador, fase 08)
  tratar a exceção — descartado porque um subreddit ruim ainda derrubaria
  os subreddits *bons* da mesma chamada, não só a execução como um todo.

## Decisão: Rate limit

- **Decision**: Manter chamadas sequenciais (loop `for...of` com `await`),
  não paralelas, para não disparar múltiplas requisições simultâneas ao
  Reddit.
- **Rationale**: O endpoint público tem limite de requisições por
  IP/User-Agent; paralelizar aumentaria o risco de bloqueio (HTTP 429).
- **Alternatives considered**: `Promise.all` para paralelizar — descartado
  pelo risco de rate limit, sem ganho de performance relevante no volume
  esperado (poucos subreddits por chamada).

## Decisão: Tipo `RedditStory` compartilhado

- **Decision**: Manter `RedditStory` em `src/types.ts` (não duplicar em
  `src/modules/reddit/`).
- **Rationale**: Já é consumido por `PipelineJob` (fase 08) e pela fila de
  revisão (fase 09) — centralizar em `types.ts` evita duas fontes de
  verdade para o mesmo contrato.
- **Alternatives considered**: Tipo local ao módulo Reddit, reexportado —
  descartado por adicionar indireção sem benefício.
