# Feature Specification: Módulo de Legendas (WhisperX)

**Feature Branch**: `005-modulo-legendas`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Módulo de legendas: transcrever o áudio de narração já gerado (Piper ou ElevenLabs) e extrair timestamp por palavra, para gerar legenda sincronizada estilo 'palavra destacada conforme a fala'."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gerar legenda sincronizada a partir da narração (Priority: P1)

Como responsável por montar o vídeo final, quero transformar o áudio de
narração já gerado em uma legenda que acompanha exatamente o que está
sendo falado, para que o vídeo tenha texto sincronizado com a voz sem eu
precisar cronometrar manualmente.

**Why this priority**: Sem legenda sincronizada, o vídeo final (fase 07)
não tem como oferecer o estilo de "palavra destacada conforme a fala" que
é característica do formato — é um insumo obrigatório da composição de
vídeo.

**Independent Test**: Pode ser testado isoladamente: passar um arquivo de
áudio real (gerado pela fase 03 ou 04) e confirmar que o resultado inclui
uma legenda tradicional válida e uma lista de palavras com o intervalo de
tempo em que cada uma é falada.

**Acceptance Scenarios**:

1. **Given** um arquivo de áudio de narração, **When** a transcrição é
   executada, **Then** o resultado inclui uma legenda tradicional válida
   (abre em qualquer player/ferramenta de legenda) e uma lista de
   palavras, cada uma com o momento de início e fim da fala.
2. **Given** o áudio é em português, **When** a transcrição é executada,
   **Then** o texto reconhecido e os timestamps são gerados considerando
   o idioma português.
3. **Given** a legenda gerada, **When** ela é conferida contra o áudio
   original (checagem auditiva), **Then** os timestamps batem com a fala
   dentro de uma margem aceitável ao ouvido.

---

### User Story 2 - Lidar com trechos de áudio sem timestamp confiável (Priority: P2)

Como responsável por rodar a geração de vídeos sem supervisão constante,
quero que ruídos ou cortes no áudio que não produzem um timestamp
confiável não quebrem a geração da legenda inteira, para que uma
narração com um pequeno trecho problemático ainda produza um vídeo
utilizável.

**Why this priority**: Sem esse tratamento, um único trecho de áudio
difícil de alinhar (ruído, respiração, corte abrupto) poderia interromper
a geração da legenda de uma história inteira, desperdiçando a narração já
gerada.

**Independent Test**: Pode ser testado com um áudio que tenha algum
trecho difícil de alinhar (silêncio, ruído) e confirmando que a
transcrição ainda completa, descartando apenas as palavras problemáticas
em vez de falhar por completo.

**Acceptance Scenarios**:

1. **Given** um áudio com algum trecho sem timestamp confiável, **When**
   a transcrição é executada, **Then** o processo completa normalmente,
   e as palavras sem timestamp confiável simplesmente não aparecem na
   lista de palavras (em vez de interromper tudo).

### Edge Cases

- O que acontece se o arquivo de áudio de entrada não existir ou estiver
  corrompido? (Deve falhar de forma identificável, não silenciosamente —
  fora do escopo desta fase detalhar a mensagem exata.)
- O que acontece com um áudio muito curto (poucos segundos)? (Deve
  processar normalmente, mesmo com pouco conteúdo para transcrever.)
- O que acontece se o modelo de transcrição/alinhamento em português
  ainda não tiver sido baixado no ambiente? (É um pré-requisito de
  ambiente, não tratado por esta fase — assume-se que a primeira
  execução already cuida do download, conforme tarefas técnicas.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST transcrever um arquivo de áudio de narração
  e produzir uma legenda tradicional válida, abrível por ferramentas
  padrão de legenda.
- **FR-002**: O sistema MUST produzir, junto com a legenda tradicional,
  uma lista de palavras reconhecidas, cada uma com o momento de início e
  de fim em que é falada.
- **FR-003**: A transcrição e o alinhamento MUST considerar o áudio como
  estando em português.
- **FR-004**: Palavras sem timestamp confiável (ruído, cortes) MUST ser
  descartadas da lista de palavras, sem interromper o restante do
  processo.
- **FR-005**: A geração de legenda MUST ser exposta através de uma
  função que recebe o caminho do áudio de entrada, o caminho de saída da
  legenda tradicional, e o tamanho do modelo de transcrição a usar.

### Key Entities

- **Palavra de legenda (CaptionWord)**: representa uma palavra
  reconhecida no áudio, com o texto da palavra e os momentos de início e
  fim de sua fala.
- **Resultado de legenda (CaptionResult)**: representa o resultado
  completo da transcrição — a lista de palavras e o caminho do arquivo de
  legenda tradicional gerado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Transcrever um áudio de teste produz uma legenda
  tradicional válida e uma lista de palavras com timestamps, sem
  intervenção manual.
- **SC-002**: Ao conferir manualmente 1–2 exemplos, os timestamps das
  palavras batem com o áudio dentro de uma margem imperceptível ao
  assistir o vídeo final.
- **SC-003**: Um áudio com trechos difíceis de alinhar (ruído, corte)
  ainda produz uma legenda utilizável — o processo não falha por completo
  nesses casos.
- **SC-004**: A legenda gerada por esta fase é aceita sem modificação
  pela fase de composição de vídeo (fase 07) como entrada válida.

## Assumptions

- A estilização visual da legenda (fonte, cor, posição, animação de
  destaque de palavra) é responsabilidade da fase 07 (composição de
  vídeo) — esta fase só produz os dados (texto + timestamps), não a
  aparência final.
- Não há tradução nem legenda em outro idioma nesta fase — o áudio de
  entrada já está em português e a legenda de saída também.
- O modelo de transcrição/alinhamento em português é baixado como parte
  da preparação do ambiente (primeira execução ou setup da fase 001), não
  em tempo de execução desta função.
- O áudio de entrada já foi gerado por uma das fases de narração (03 ou
  04) — esta fase não gera nem valida a origem do áudio, só o transcreve.
