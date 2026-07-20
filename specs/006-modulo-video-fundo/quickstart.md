# Quickstart: Módulo de Vídeo de Fundo (Pexels)

Guia para validar as User Stories 1 e 2 do spec.md contra
`src/modules/video/backgroundVideoProvider.ts`.

## Pré-requisitos

- `PEXELS_API_KEY` válida configurada (fase 001).
- Acesso de rede de saída para `api.pexels.com`.

## Validação — User Story 1 (busca de vídeo vertical)

1. Chamar `findBackgroundVideo("pessoa organizando mesa", apiKey)`.
   - **Resultado esperado**: `downloadUrl` válido e `durationSeconds`
     numérico; o arquivo referenciado é vertical (cenário 1).
2. Repetir com 2–3 queries diferentes (ex: "paisagem de floresta",
   "cozinha organizada").
   - **Resultado esperado**: em cada caso, o arquivo escolhido é o de
     maior resolução vertical entre as opções retornadas (cenário 2,
     SC-003) — conferir manualmente olhando a resposta bruta da API se
     necessário.

## Validação — User Story 2 (erro claro sem resultado adequado)

1. Chamar `findBackgroundVideo` com uma query improvável de retornar
   resultados (ex: uma string aleatória sem sentido).
   - **Resultado esperado**: erro lançado identificando a query sem
     resultado (cenário 1).
2. (Se possível reproduzir) Chamar com uma query cujos resultados não
   tenham nenhum arquivo vertical.
   - **Resultado esperado**: erro claro identificando a ausência de opção
     vertical — **não** um `TypeError` genérico (cenário 2).
   - **Status atual conhecido**: antes da correção descrita em
     `research.md`, este caso quebra com um erro confuso
     (`Cannot read properties of undefined`) em vez do erro claro
     esperado.

## Critério de conclusão da fase

Ambas as validações passam sem intervenção manual; nenhum erro do tipo
`TypeError`/`undefined` genérico deve aparecer nos cenários de falha.
