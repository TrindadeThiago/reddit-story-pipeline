# Data Model: Módulo de Vídeo de Fundo (Pexels)

## Resultado de busca (retorno de `findBackgroundVideo`)

Não é um tipo nomeado em `src/types.ts` — é um objeto literal retornado
diretamente pela função.

| Campo | Tipo | Descrição |
|---|---|---|
| `downloadUrl` | string | URL de download do arquivo de vídeo, maior resolução vertical disponível (FR-003, FR-004) |
| `durationSeconds` | number | Duração do vídeo, em segundos (FR-004) |

## Descrição de cena (parâmetro de entrada)

| Campo | Tipo | Descrição |
|---|---|---|
| `query` | string | Texto livre descrevendo a cena desejada (FR-001) |
| `pexelsApiKey` | string | Chave de API do Pexels (`PEXELS_API_KEY`, fase 001) |

## Erros (conceito, não persistido)

Dois cenários distintos de falha, cada um com mensagem identificável
(FR-005, FR-006):

| Cenário | Identificação no erro |
|---|---|
| Nenhum vídeo retornado pela busca | Query usada, sem resultado |
| Vídeos retornados, nenhum em orientação vertical | Query usada, sem opção vertical disponível |
