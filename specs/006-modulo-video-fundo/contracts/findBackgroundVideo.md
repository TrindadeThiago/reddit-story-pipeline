# Contract: findBackgroundVideo

Interface de função exposta pelo módulo de vídeo de fundo para o restante
do pipeline (composição de vídeo, fase 07; orquestrador, fase 08).

```ts
function findBackgroundVideo(
  query: string,
  pexelsApiKey: string
): Promise<{ downloadUrl: string; durationSeconds: number }>
```

## Comportamento esperado

- Resolve com `downloadUrl` (URL de download utilizável) e
  `durationSeconds` (número positivo).
- O arquivo referenciado por `downloadUrl` está sempre em orientação
  retrato (`width < height`).
- Entre múltiplas opções verticais disponíveis, escolhe a de maior
  `height`.

## Erros

| Cenário | Comportamento esperado |
|---|---|
| Busca sem nenhum vídeo retornado pela API | Rejeita com erro identificando a `query` usada (FR-005) |
| Vídeos retornados, mas nenhum arquivo com `width < height` | Rejeita com erro identificando a `query` e que nenhuma opção vertical foi encontrada (FR-006) — **não** deve lançar `TypeError` genérico por acessar propriedade de `undefined` |
| Chave de API inválida/expirada | Rejeita com erro derivado da resposta da API (não tratado como "sem resultado") |
