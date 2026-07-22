# Quickstart: Validar a suite de testes Vitest

## Pre-requisitos

- Node.js e Yarn instalados (mesma versao usada pelo restante do projeto).
- Dependencias instaladas: `yarn install` (instala `vitest` como devDependency apos a implementacao desta feature).

## Rodar a suite completa

```bash
yarn test
```

**Resultado esperado**: o Vitest executa todos os arquivos em `tests/**/*.test.ts`,
imprime um resumo por arquivo (quantidade de `it`/casos passados e falhos) e
termina com codigo de saida `0`. Nenhuma chamada de rede real, nenhum
processo `ffmpeg`/Piper real e nenhuma credencial real e necessaria (FR-009,
FR-010).

## Rodar em watch mode (durante desenvolvimento de um teste)

```bash
npx vitest
```

**Resultado esperado**: Vitest fica observando mudancas de arquivo e re-roda
apenas os testes afetados.

## Rodar apenas um modulo

```bash
npx vitest run tests/modules/tts
```

**Resultado esperado**: apenas os testes de `piperProvider`,
`elevenLabsProvider` e `quotaTracker` rodam.

## Validar a estrutura espelhada (User Story 2)

```bash
# lista arquivos .ts elegiveis em src/ (exclui types.ts e barris index.ts)
find src -name "*.ts" \
  ! -name "types.ts" \
  ! -name "index.ts" \
  ! -name "*.test.ts" | sort

# lista arquivos de teste correspondentes em tests/
find tests -name "*.test.ts" | sort
```

**Resultado esperado**: para cada caminho listado pelo primeiro comando
(`src/<resto>/<arquivo>.ts`), existe uma linha equivalente no segundo
comando (`tests/<resto>/<arquivo>.test.ts`).

## Confirmar que um teste falho e reportado corretamente (User Story 1, cenario 2)

1. Introduza temporariamente uma asserção falsa em qualquer arquivo de
   `tests/` (ex.: `expect(1).toBe(2)`).
2. Rode `yarn test`.
3. **Resultado esperado**: o Vitest reporta o arquivo, o nome do teste e a
   diferenca esperado/recebido; o comando termina com codigo de saida
   diferente de `0`.
4. Reverta a alteracao temporaria.

## Rodar com cobertura (FR-012 a FR-014, SC-005)

```bash
yarn test:coverage
```

**Resultado esperado**: o Vitest roda a suite uma vez com medicao de
cobertura via `@vitest/coverage-v8`, imprime um resumo por arquivo (linhas,
funcoes, branches, statements) e gera um relatorio navegavel em
`coverage/index.html`. Se qualquer arquivo elegivel de `src/` ficar abaixo
de 100% em qualquer uma das quatro metricas, o comando termina com codigo de
saida diferente de `0`, apontando o arquivo e as linhas/branches nao
cobertas.

## Confirmar migracao dos testes de `fetchStories` (FR-008)

```bash
npx vitest run tests/modules/reddit
```

**Resultado esperado**: os casos anteriormente em
`src/modules/reddit/fetchStories.test.ts` e
`src/modules/reddit/fetchStories.missing-credentials.test.ts` continuam
passando a partir de `tests/modules/reddit/`, e esses dois arquivos nao
existem mais dentro de `src/`.
