# Contract: fetchStories

Interface de função exposta pelo módulo Reddit para o restante do
pipeline (orquestrador, fase 08).

```ts
interface FetchStoriesOptions {
  subreddits: string[];
  minScore: number;
  minBodyLength: number;
  limit: number;
}

function fetchStories(options: FetchStoriesOptions): Promise<RedditStory[]>
```

Este contrato é fixo — a fase 08 (orquestrador) e a fase 10 (scripts CLI)
dependem dele não mudar de assinatura.

## Comportamento esperado

- Resolve com um array de `RedditStory` — pode ser vazio, nunca `null`/`undefined`.
- Nunca rejeita (`throw`/reject) por causa de UM subreddit específico
  falhar (FR-007) — a promise só deve rejeitar em uma condição verdadeiramente
  fatal e não relacionada a um subreddit individual (ex: `options.subreddits`
  vazio, se essa validação for adicionada).
- Histórias fora dos critérios de `minScore`/`minBodyLength` nunca aparecem
  no array resolvido.

## Erros

| Cenário | Comportamento |
|---|---|
| Subreddit inexistente | Não interrompe os demais; falha reportada de forma identificável (log/estrutura de retorno) |
| Falha de rede num subreddit | Idem acima |
| Nenhuma história atende aos critérios | Resolve com array vazio — não é erro |
