# Phase 1 Data Model: Testes Unitarios com Vitest

Esta feature nao introduz entidades de dominio/persistencia novas. As
"entidades" relevantes sao conceitos de organizacao da suite de testes,
listados abaixo para orientar a fase de tasks.

## Arquivo elegivel para teste

Representa um arquivo de `src/` que contem logica executavel e que, por
isso, deve ter um arquivo de teste correspondente em `tests/`.

- **Caminho de origem**: caminho relativo dentro de `src/` (ex.: `modules/tts/quotaTracker.ts`)
- **Caminho de teste espelhado**: mesmo caminho relativo dentro de `tests/`, com sufixo `.test.ts` (ex.: `tests/modules/tts/quotaTracker.test.ts`)
- **Classificacao**: `testar` | `excluido-tipagem` | `excluido-barril`
- **Dependencias externas**: lista de modulos que precisam ser mockados no teste (ex.: `["fetch"]`, `["fluent-ffmpeg"]`, `["node:child_process"]`, `["node:fs"]`, `[]` quando puramente logica pura)

Regra de classificacao (aplicada durante o levantamento em `plan.md` §Project Structure):
- `excluido-tipagem`: arquivo cujo unico conteudo e definicao de tipos/interfaces sem funcao executavel (`src/types.ts`, `src/modules/tts/ttsProvider.ts`).
- `excluido-barril`: arquivo `index.ts` cujo unico conteudo e `export * from "..."` (sem nenhuma funcao/constante propria).
- `testar`: todo o restante.

## Caso de teste (dentro de um arquivo de teste)

- **Descricao**: o que o caso valida, em linguagem de comportamento (`describe`/`it`)
- **Tipo**: `caminho-feliz` | `borda` | `erro`
- **Dependencias mockadas**: quais chamadas externas foram substituidas por `vi.fn()`/`vi.mock()` e com que retorno/efeito colateral simulado
- **Resultado esperado**: asserção observavel (valor de retorno, excecao lancada, chamada de mock com argumentos especificos)

## Estrutura espelhada de diretorios

- **Regra**: para cada diretorio em `src/` que contenha ao menos um arquivo `testar`, existe o diretorio correspondente em `tests/` com o mesmo nome e mesma posicao relativa.
- **Verificacao**: a comparacao arvore-a-arvore descrita na User Story 2 (spec.md) e o criterio de aceite estrutural; nao ha um mecanismo automatizado de enforcement previsto nesta fase (fica registrado como possível melhoria futura, fora de escopo).

## Relacao com o `TtsProvider` (Principio II da constituicao)

- Testes de `piperProvider.ts` e `elevenLabsProvider.ts` validam cada implementacao **isoladamente** contra o contrato `TtsProvider` (mesma assinatura `synthesize(text, outputPath): Promise<NarrationResult>`), sem que um teste dependa do outro ou que o codigo de producao ramifique por `provider.name`.
