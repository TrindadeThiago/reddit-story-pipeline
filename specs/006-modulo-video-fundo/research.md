# Research: Módulo de Vídeo de Fundo (Pexels)

Sem marcadores `NEEDS CLARIFICATION` no Technical Context. Decisões abaixo
consolidam o que já está implementado em
`src/modules/video/backgroundVideoProvider.ts` e o gap encontrado.

## Decisão: Erro claro quando nenhum arquivo vertical é encontrado (gap a fechar)

- **Decision**: Após filtrar `video.video_files` por `width < height` e
  ordenar por `height` decrescente, verificar explicitamente se o array
  resultante está vazio e lançar um erro claro identificando a query,
  antes de acessar `[0].link`.
- **Rationale**: A implementação atual faz
  `video.video_files.filter(...).sort(...)[0]` e usa o resultado
  diretamente (`file.link`) sem checar se `file` é `undefined`. A API do
  Pexels pode retornar um vídeo cujo `video_files` não tenha nenhuma
  variante com `width < height` mesmo com `orientation=portrait` na
  busca (a orientação do vídeo como um todo não garante que toda
  variante de arquivo individual tenha as mesmas proporções). Sem a
  checagem, isso quebra com `Cannot read properties of undefined
  (reading 'link')` — um erro que não identifica a causa raiz (falta de
  variante vertical), violando FR-006/US2.
- **Alternatives considered**: Cair para qualquer arquivo disponível
  (ignorando orientação) como fallback — descartado porque violaria
  FR-002 (só retornar vídeos em orientação retrato); é melhor falhar
  claramente do que entregar um vídeo horizontal sem avisar.

## Decisão: Ausência de resultado de busca (já coberto)

- **Decision**: Manter a checagem já implementada —
  `if (!video) throw new Error(...)` quando `json.videos?.[0]` é
  `undefined`.
- **Rationale**: Já atende FR-005/cenário 1 de US2 — identifica a query
  sem resultado antes de tentar processar um vídeo inexistente.
- **Alternatives considered**: N/A — comportamento já correto.

## Decisão: Escolha do arquivo de maior resolução vertical

- **Decision**: Manter `sort((a, b) => b.height - a.height)[0]` sobre os
  arquivos já filtrados por orientação retrato.
- **Rationale**: Atende FR-003/SC-003 diretamente — maior `height` entre
  os arquivos verticais corresponde à maior resolução vertical
  disponível.
- **Alternatives considered**: Escolher por `width * height` (área
  total) — descartado por não ser o critério pedido pela spec original
  ("maior resolução vertical", interpretado como maior altura já que a
  orientação é fixa em retrato).

## Decisão: `per_page=5` fixo

- **Decision**: Manter a busca limitada às 5 primeiras opções retornadas
  pela API do Pexels para a query.
- **Rationale**: Suficiente para encontrar uma opção vertical de boa
  qualidade na maioria dos casos, sem paginação adicional — consistente
  com o volume baixo de uso do pipeline.
- **Alternatives considered**: Paginar até encontrar uma opção vertical
  se as primeiras 5 falharem — descartado por complexidade
  desproporcional; se a query não retornar nenhuma opção vertical nas 5
  primeiras, o erro claro (ver decisão acima) já orienta a tentar outra
  query.
