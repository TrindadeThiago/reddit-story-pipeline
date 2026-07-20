# Feature Specification: Módulo Reddit (busca de histórias)

**Feature Branch**: `002-modulo-reddit`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Módulo Reddit: buscar histórias de subreddits de história, filtrando por engajamento (score) e tamanho mínimo de texto, para alimentar o restante do pipeline."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Buscar histórias relevantes em múltiplos subreddits (Priority: P1)

Como responsável por gerar vídeos a partir de histórias do Reddit, quero
buscar as histórias mais engajadas de uma lista de subreddits de história,
já filtradas por um score mínimo e um tamanho mínimo de texto, para não
perder tempo descartando manualmente histórias fracas ou curtas demais
para virar um vídeo decente.

**Why this priority**: É o ponto de entrada de todo o pipeline — sem
histórias de qualidade mínima chegando aqui, nenhuma fase seguinte
(narração, legenda, vídeo) tem o que processar.

**Independent Test**: Pode ser testado sozinho: chamar a busca com uma
lista de subreddits reais e limites de score/tamanho, e conferir que o
resultado só contém histórias que atendem aos dois critérios,
combinando resultados de todos os subreddits informados.

**Acceptance Scenarios**:

1. **Given** uma lista com um subreddit real de histórias, **When** a
   busca é executada, **Then** o resultado é uma lista de histórias, cada
   uma com identificador, subreddit de origem, título, corpo do texto,
   link e pontuação de engajamento.
2. **Given** um score mínimo e um tamanho mínimo de texto configurados,
   **When** a busca retorna candidatas do Reddit, **Then** histórias
   abaixo de qualquer um dos dois limites são excluídas do resultado
   final.
3. **Given** uma lista com múltiplos subreddits, **When** a busca é
   executada em uma única chamada, **Then** o resultado é a união das
   histórias válidas de todos eles.

---

### User Story 2 - Continuar funcionando quando um subreddit falha (Priority: P2)

Como responsável por rodar a geração de vídeos em lote sem supervisão
constante, quero que uma falha ao buscar um subreddit específico (rede
instável, nome inexistente) não interrompa a busca dos demais, e que eu
consiga entender o que deu errado depois.

**Why this priority**: Sem isso, um único subreddit com problema (fora do
ar, digitado errado) derruba a geração de vídeos do dia inteiro, mesmo que
os outros subreddits estivessem funcionando normalmente.

**Independent Test**: Pode ser testado configurando uma lista com um
subreddit válido e um inválido/inexistente, e confirmando que a busca
ainda retorna as histórias do subreddit válido, registrando de forma
identificável o que aconteceu com o inválido.

**Acceptance Scenarios**:

1. **Given** uma lista com um subreddit inexistente e um subreddit válido,
   **When** a busca é executada, **Then** o processo não é interrompido e
   as histórias do subreddit válido são retornadas normalmente.
2. **Given** uma falha de rede ao consultar um subreddit, **When** ela
   ocorre, **Then** uma mensagem de erro clara e identificável (qual
   subreddit, qual motivo) fica disponível para quem está operando o
   pipeline.

### Edge Cases

- O que acontece quando nenhuma história de nenhum subreddit atende aos
  critérios mínimos de score e tamanho? (Retorna lista vazia, sem erro —
  isso é um resultado válido, não uma falha.)
- Como o sistema se comporta ao ser chamado repetidamente em curto
  intervalo de tempo? (Deve respeitar os limites de uso do serviço
  público do Reddit para não ser bloqueado.)
- O que acontece se o mesmo subreddit for informado duas vezes na lista?
  (Fora de escopo desta fase — não há deduplicação entre histórias
  repetidas nem entre execuções.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir buscar histórias de uma lista de um
  ou mais subreddits em uma única operação.
- **FR-002**: O sistema MUST excluir do resultado histórias cujo
  engajamento (score) esteja abaixo de um limite mínimo configurável.
- **FR-003**: O sistema MUST excluir do resultado histórias cujo texto
  tenha tamanho abaixo de um limite mínimo configurável de caracteres.
- **FR-004**: O sistema MUST permitir limitar a quantidade de histórias
  retornadas por chamada.
- **FR-005**: Cada história retornada MUST incluir identificador,
  subreddit de origem, título, corpo do texto, link de origem e
  pontuação de engajamento.
- **FR-006**: O sistema MUST identificar suas requisições de forma
  customizada perante o serviço do Reddit, conforme exigido pelos termos
  de uso da plataforma.
- **FR-007**: Uma falha ao buscar um subreddit específico (erro de rede,
  subreddit inexistente) MUST ser tratada sem interromper a busca dos
  demais subreddits da mesma chamada, e MUST ser reportada de forma clara
  o suficiente para identificar qual subreddit falhou e por quê.

### Key Entities

- **História (RedditStory)**: representa um post de um subreddit
  candidato a virar vídeo. Atributos: identificador único, subreddit de
  origem, título, corpo do texto, link de origem, pontuação de
  engajamento (score).
- **Critérios de busca**: representam os parâmetros que definem quais
  histórias entram no resultado — lista de subreddits, score mínimo,
  tamanho mínimo de texto, e limite de quantidade de histórias.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma busca contra subreddits reais retorna apenas histórias
  que atendem simultaneamente aos limites de score e tamanho configurados
  — 0% de histórias fora dos critérios no resultado.
- **SC-002**: Uma falha isolada em um subreddit (inexistente ou
  indisponível) não reduz a taxa de sucesso da busca nos demais
  subreddits da mesma chamada — as histórias válidas de subreddits
  saudáveis continuam sendo retornadas.
- **SC-003**: Buscar em múltiplos subreddits numa única chamada devolve o
  mesmo conjunto de histórias que buscar cada subreddit separadamente e
  unir os resultados manualmente.
- **SC-004**: A ferramenta consegue alimentar o restante do pipeline
  (narração, legenda, vídeo) com histórias suficientemente longas para
  gerar um vídeo de duração adequada, sem exigir edição manual do texto
  antes de prosseguir.

## Assumptions

- O volume de histórias necessário por execução é baixo o suficiente para
  ser atendido pelo endpoint público do Reddit, sem exigir autenticação
  via aplicativo registrado (OAuth) — isso só entraria em escopo se o
  volume crescer além do limite do acesso público.
- Não há necessidade, nesta fase, de evitar reprocessar uma história já
  usada em execuções anteriores (deduplicação entre execuções fica para
  uma fase futura, se o mesmo post começar a aparecer repetido).
- A curadoria de qualidade se limita a score e tamanho do texto — não há,
  nesta fase, avaliação automática de quão bem a história "funciona"
  narrativamente.
- Os subreddits de origem são de temática histórica/narrativa, adequados
  para virar vídeos de narração; a escolha de quais subreddits usar é uma
  decisão de configuração, não de código.
