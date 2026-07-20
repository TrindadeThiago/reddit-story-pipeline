# Data Model: Módulo Reddit (busca de histórias)

## RedditStory

Representa um post de subreddit candidato a virar vídeo.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | Identificador único do post no Reddit |
| `subreddit` | string | Subreddit de origem |
| `title` | string | Título do post |
| `body` | string | Corpo do texto (selftext) — insumo para a narração |
| `url` | string | Link de origem no Reddit |
| `score` | number | Pontuação de engajamento (upvotes líquidos) |

**Regras de validação** (aplicadas na busca, não no tipo):
- Só entram no resultado histórias com `score >= minScore` e
  `body.length >= minBodyLength` (FR-002, FR-003).

## Critérios de busca (FetchStoriesOptions)

Parâmetros de entrada da busca — não persistidos, válidos só durante a
chamada.

| Campo | Tipo | Descrição |
|---|---|---|
| `subreddits` | string[] | Lista de subreddits a consultar (FR-001) |
| `minScore` | number | Score mínimo de corte (FR-002) |
| `minBodyLength` | number | Tamanho mínimo de texto, em caracteres (FR-003) |
| `limit` | number | Máximo de posts avaliados por subreddit (FR-004) |

## Falha por subreddit (conceito, não persistido)

Não é uma entidade de dados, mas um resultado possível da operação:
identifica qual subreddit falhou (nome) e o motivo (erro de rede, resposta
inesperada, subreddit inexistente) — usado para satisfazer FR-007 sem
interromper os demais subreddits da mesma chamada.
