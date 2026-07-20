# Feature Specification: Módulo de Vídeo de Fundo (Pexels)

**Feature Branch**: `006-modulo-video-fundo`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Módulo de vídeo de fundo: buscar um vídeo de fundo royalty-free (formato retrato) para servir de 'distração visual' atrás da narração, evitando risco de direitos autorais."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Encontrar um vídeo de fundo vertical para a narração (Priority: P1)

Como responsável por montar o vídeo final, quero buscar um vídeo de fundo
livre de direitos autorais, já em formato vertical, a partir de uma
descrição do tipo de cena desejada, para dar uma "distração visual" atrás
da narração sem correr risco de usar conteúdo protegido.

**Why this priority**: Sem um vídeo de fundo, a composição de vídeo (fase
07) não tem o que colocar atrás da narração — é um insumo obrigatório do
formato de vídeo vertical.

**Independent Test**: Pode ser testado isoladamente: passar uma descrição
de cena válida e confirmar que o resultado é um vídeo em orientação
retrato, com um link de download utilizável e a duração do vídeo
disponível.

**Acceptance Scenarios**:

1. **Given** uma descrição de cena válida (ex: "pessoa organizando
   mesa"), **When** a busca é executada, **Then** o resultado é um vídeo
   em orientação retrato (mais alto do que largo), com link de download e
   duração.
2. **Given** múltiplas opções de vídeo disponíveis para a mesma busca,
   **When** o resultado é escolhido, **Then** é o arquivo de maior
   resolução vertical entre as opções retornadas.

---

### User Story 2 - Saber quando nenhuma cena adequada foi encontrada (Priority: P2)

Como responsável por rodar a geração de vídeos em lote, quando uma busca
de vídeo de fundo não encontra nenhum resultado adequado, quero um erro
claro que identifique o problema, para não descobrir um vídeo quebrado ou
incompleto só na hora da revisão manual.

**Why this priority**: Sem um erro claro, uma busca sem resultado (ou sem
nenhum arquivo em orientação vertical) pode gerar uma falha confusa mais
adiante no pipeline (composição de vídeo), dificultando saber que a causa
raiz foi a busca de vídeo de fundo.

**Independent Test**: Pode ser testado com uma descrição de cena
improvável de retornar resultados e confirmando que o erro recebido
identifica claramente que não foi encontrado vídeo para aquela busca.

**Acceptance Scenarios**:

1. **Given** uma descrição de cena sem nenhum resultado, **When** a busca
   é executada, **Then** um erro claro é lançado, identificando a
   descrição de cena usada na busca sem resultado.
2. **Given** uma busca que retorna vídeos mas nenhum deles em orientação
   vertical, **When** o resultado é processado, **Then** um erro claro é
   lançado (não uma falha genérica/confusa), identificando que nenhuma
   opção vertical foi encontrada.

### Edge Cases

- O que acontece se a chave de API do Pexels for inválida ou expirada?
  (Deve resultar em erro identificável, não em uma falha silenciosa
  tratada como "nenhum resultado".)
- O que acontece se a mesma busca for repetida muitas vezes em sequência?
  (Fora de escopo desta fase — não há cache/download local; cada busca é
  uma nova consulta à API.)
- O que acontece se o clipe retornado tiver marca d'água ou texto visível
  indesejado? (Fora de escopo desta fase — checagem de qualidade do
  conteúdo do clipe é manual por enquanto.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST buscar um vídeo de fundo a partir de uma
  descrição de cena (texto livre).
- **FR-002**: O sistema MUST retornar apenas vídeos em orientação retrato
  (mais alto do que largo).
- **FR-003**: Quando existirem múltiplas opções de arquivo de vídeo para
  o mesmo resultado, o sistema MUST escolher a de maior resolução
  vertical disponível.
- **FR-004**: O resultado MUST incluir um link de download utilizável e a
  duração do vídeo em segundos.
- **FR-005**: Uma busca sem nenhum resultado MUST lançar um erro claro,
  identificando a descrição de cena usada.
- **FR-006**: Uma busca cujos resultados não incluam nenhum arquivo em
  orientação vertical MUST lançar um erro claro e identificável, distinto
  de uma falha genérica — não deve travar ou retornar dados inválidos
  (ex: um link vazio).

### Key Entities

- **Vídeo de fundo**: representa o resultado de uma busca — um link de
  download utilizável e a duração do vídeo em segundos, sempre em
  orientação retrato.
- **Descrição de cena**: o texto livre usado como critério de busca (ex:
  "pessoa organizando mesa"), definido por quem opera o pipeline.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma busca com uma descrição de cena válida retorna, em
  praticamente todos os casos do dia a dia, um vídeo em orientação
  retrato pronto para a composição de vídeo (fase 07) usar sem ajuste
  manual.
- **SC-002**: 100% das buscas sem resultado (ou sem opção vertical)
  terminam em um erro identificável — nunca em um resultado incompleto ou
  em uma falha confusa mais adiante no pipeline.
- **SC-003**: O vídeo escolhido é sempre, entre as opções retornadas pela
  busca, o de maior resolução vertical disponível — nunca uma opção de
  qualidade inferior quando uma melhor estava disponível.

## Assumptions

- Não há download nem cache local do vídeo de fundo nesta fase — a
  composição de vídeo (fase 07) consome a URL de download diretamente.
- Não há rotação/variedade automática de descrições de cena para evitar
  repetição de tipo de vídeo — a descrição usada em cada busca é decisão
  de quem opera o pipeline (manual ou configurada externamente).
- A curadoria de qualidade do clipe (marca d'água, texto visível,
  adequação do conteúdo) é checada manualmente por enquanto, fora do
  escopo desta busca automatizada.
