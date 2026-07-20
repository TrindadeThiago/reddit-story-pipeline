# Research: Orquestrador do Pipeline

Sem marcadores `NEEDS CLARIFICATION` no Technical Context. Decisões abaixo
consolidam o que já está implementado em `src/pipeline.ts` e o bug crítico
de integração encontrado.

## Decisão: Baixar o vídeo de fundo para um arquivo local antes de compor (gap crítico a fechar)

- **Decision**: Em `runPipelineForStory`, após `findBackgroundVideo`
  retornar `downloadUrl`, baixar o conteúdo via `fetch` e gravar em
  `join(workDir, "background.mp4")` (ou extensão equivalente) antes de
  chamar `composeVideo`, passando esse caminho local como
  `backgroundVideoPath`.
- **Rationale**: `findBackgroundVideo` (fase 06) retorna apenas uma URL
  remota — por design, essa fase não baixa nada (ver
  `specs/006-modulo-video-fundo/spec.md` § Assumptions). `composeVideo`
  (fase 07), após a correção feita nessa mesma fase, verifica
  `existsSync(backgroundVideoPath)` antes de rodar o ffmpeg — uma URL
  remota (`https://...`) nunca existe como caminho de arquivo local, então
  `existsSync` sempre retorna `false`. Sem essa correção no orquestrador,
  **toda** execução de `runPipelineForStory` quebraria na etapa de
  composição com "arquivo de entrada não encontrado (backgroundVideoPath)",
  mesmo com a busca de vídeo de fundo funcionando perfeitamente — um bug
  de integração entre fases corretas individualmente. Isso viola FR-006 e
  bloqueia SC-001 por completo (nenhuma execução ponta a ponta teria
  sucesso).
- **Alternatives considered**: Reverter a checagem `existsSync` da fase 07
  para aceitar URLs remotas (deixando o ffmpeg lidar com o input HTTP
  diretamente) — descartado porque o ffmpeg com input HTTP direto tem
  comportamento menos previsível (timeouts, redirecionamentos, retries)
  do que baixar o arquivo primeiro; baixar localmente também deixa o
  arquivo do vídeo de fundo disponível dentro da pasta do job
  (`storage/pending-review/<jobId>/`), consistente com os demais
  artefatos (narração, legenda, vídeo final) que já ficam lá.

## Decisão: Contexto de etapa nos erros (FR-005)

- **Decision**: Envolver cada chamada de etapa (`synthesize`,
  `generateCaptions`, `findBackgroundVideo` + download, `composeVideo`,
  `enqueueForReview`) de forma que, se a etapa rejeitar, o erro relançado
  inclua o nome da etapa e o `jobId`/`story.id`, preservando a causa
  original (`{ cause: originalError }` ou mensagem concatenada).
- **Rationale**: A implementação atual encadeia `await` diretamente, sem
  identificar em qual `await` a exceção ocorreu — quem vê o erro só tem a
  mensagem original do módulo (ex: "Nenhum video encontrado para query:
  X"), que é específica o suficiente na maioria dos casos, mas não deixa
  explícito que isso aconteceu "na etapa de busca de vídeo de fundo do
  job Y" quando o erro se propaga através de várias camadas (ex: script
  CLI da fase 10 chamando o orquestrador). Atende FR-005/SC-003
  diretamente.
- **Alternatives considered**: Deixar como está, confiando que a mensagem
  de cada módulo já é específica o suficiente — parcialmente verdadeiro
  (fases 02, 05, 06, 07 já têm mensagens de erro razoavelmente claras
  após as correções das fases anteriores), mas não há garantia uniforme
  entre todas as etapas, e a spec original já pede identificação de etapa
  explicitamente.

## Decisão: `jobId` único por execução

- **Decision**: Manter `${story.id}-${Date.now()}` como já implementado.
- **Rationale**: Atende FR-002/SC-004 — mesmo rodando a mesma história
  duas vezes seguidas, o timestamp em milissegundos garante um `jobId`
  diferente na prática (exceto colisão teoricamente possível se duas
  chamadas ocorrerem no mesmo milissegundo exato, o que não acontece em
  execução sequencial de um pipeline batch).
- **Alternatives considered**: UUID — mais robusto contra colisão teórica,
  mas desnecessário dado o padrão de uso sequencial (nunca duas execuções
  simultâneas para a mesma história, ver spec § Assumptions).

## Decisão: Injeção de `ttsProvider` via `RunPipelineDeps`

- **Decision**: Manter `deps.ttsProvider: TtsProvider` como já
  implementado — nenhuma lógica condicional dentro de `pipeline.ts` sobre
  qual provider está sendo usado.
- **Rationale**: Atende FR-003/SC-002 diretamente — a fase 03 e 04 já
  garantem que qualquer implementação de `TtsProvider` tem a mesma
  interface; o orquestrador não precisa saber qual é.
- **Alternatives considered**: N/A — já é a decisão correta, herdada do
  contrato fixo das fases 03/04.
