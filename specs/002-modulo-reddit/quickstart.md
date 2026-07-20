# Quickstart: Módulo Reddit (busca de histórias)

Guia para validar as User Stories 1 e 2 do spec.md contra
`src/modules/reddit/fetchStories.ts`.

## Pré-requisitos

- Ambiente da fase 001 pronto (`npm install`, `tsconfig.json` ok).
- Acesso de rede de saída ao domínio `reddit.com`.

## Validação — User Story 1 (busca + filtro)

1. Chamar `fetchStories` com um subreddit real de histórias (ex:
   `AskHistorians`), `minScore` e `minBodyLength` moderados, e `limit`
   pequeno (ex: 10).
   - **Resultado esperado**: array de `RedditStory`, todas com
     `score >= minScore` e `body.length >= minBodyLength` (cenário 1 e 2
     do spec).
2. Repetir com 2–3 subreddits na mesma chamada.
   - **Resultado esperado**: resultado é a união das histórias válidas de
     todos eles (cenário 3).

## Validação — User Story 2 (resiliência a falha)

1. Chamar `fetchStories` com uma lista contendo um subreddit válido e um
   subreddit inexistente (ex: nome aleatório improvável de existir).
   - **Resultado esperado**: as histórias do subreddit válido ainda
     voltam no resultado; a falha do subreddit inválido não derruba a
     chamada inteira (cenário 1).
   - **Status atual conhecido**: a implementação em
     `fetchStories.ts` ainda NÃO isola esse erro (ver `research.md` §
     Isolamento de falha por subreddit) — este passo deve falhar até essa
     lacuna ser corrigida na fase de implementação.

## Critério de conclusão da fase

Ambas as validações acima passam sem intervenção manual, e nenhuma
história fora dos critérios de score/tamanho aparece no resultado.
