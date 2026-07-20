# Research: Módulo TTS — ElevenLabs + controle de cota

Sem marcadores `NEEDS CLARIFICATION` no Technical Context. Decisões abaixo
consolidam o que já está implementado em
`src/modules/tts/{elevenLabsProvider,quotaTracker}.ts` e o gap crítico
encontrado.

## Decisão: Checagem de cota precisa ser aguardada (gap crítico a fechar)

- **Decision**: Adicionar `await` em `this.quota.assertHasBudget(text.length)`
  dentro de `ElevenLabsProvider.synthesize`, antes da chamada `fetch` à
  API do ElevenLabs.
- **Rationale**: `assertHasBudget` é `async` e rejeita a promise (via
  `throw` dentro de uma função async) quando a cota estouraria. Sem
  `await`, a chamada dispara a promise mas o código **não espera** o
  resultado — a execução segue direto para o `fetch` da API real
  enquanto a promise de `assertHasBudget` ainda está em voo (e, se
  rejeitar, vira uma unhandled promise rejection em vez de interromper o
  fluxo). Isso significa que hoje uma síntese que estouraria a cota
  **ainda faz a chamada paga à API antes de qualquer bloqueio ter efeito
  real** — o oposto do que FR-003/FR-004 e SC-002 exigem.
- **Alternatives considered**: Nenhuma — este é um bug de uso incorreto
  de `async`/`await`, não uma decisão de design com trade-offs.

## Decisão: `recordUsage` também precisa ser aguardado

- **Decision**: Adicionar `await` em `this.quota.recordUsage(text.length)`
  após a escrita do áudio ser confirmada.
- **Rationale**: Mesmo problema de padrão — sem `await`, o processo pode
  encerrar (ex: script CLI de regeneração terminando) antes da escrita em
  disco do novo estado de cota ser concluída, perdendo o registro de uso
  daquela síntese e permitindo estourar a cota em uma chamada futura sem
  perceber (viola indiretamente FR-007/SC-003).
- **Alternatives considered**: Nenhuma — mesma classe de bug do item
  anterior.

## Decisão: Contabilizar uso só após sucesso confirmado

- **Decision**: Manter a ordem já implementada — `assertHasBudget` antes
  do `fetch`, `recordUsage` só depois do `writeFile` do áudio ter
  sucesso.
- **Rationale**: Atende FR-005 diretamente: se o `fetch` ou a escrita em
  disco falhar, a exceção interrompe a função antes de `recordUsage` ser
  chamado — nenhum caractere é debitado por uma síntese que não gerou
  áudio.
- **Alternatives considered**: Debitar a cota antes da chamada (otimista)
  — descartado por poder descontar cota de sínteses que falham.

## Decisão: Reset mensal automático

- **Decision**: Manter a comparação `state.yearMonth !== currentYearMonth()`
  em `loadState`, que zera `charactersUsed` quando o mês muda.
- **Rationale**: Atende FR-006/SC-004 sem precisar de um job agendado —
  o reset acontece de forma preguiçosa (lazy), na primeira leitura do
  novo mês.
- **Alternatives considered**: Cron/scheduler para resetar a cota à
  meia-noite do dia 1 — descartado por complexidade desnecessária; a
  abordagem lazy já é suficiente para o padrão de uso (chamadas
  esporádicas, não um serviço sempre rodando).

## Decisão: Estado da cota sobrevive a arquivo corrompido/ausente

- **Decision**: Manter o `catch` em `loadState` que trata qualquer falha
  de leitura/parse como "sem uso registrado ainda" (`charactersUsed: 0`
  no mês corrente).
- **Rationale**: Evita que um arquivo ausente (primeira execução) ou
  corrompido trave o processo — comportamento seguro por padrão (assume
  zero uso, não infinito).
- **Alternatives considered**: Lançar erro e exigir intervenção manual —
  descartado por ser mais frágil sem benefício claro (o pior caso do
  comportamento atual é subestimar o uso já feito, não superestimar).
