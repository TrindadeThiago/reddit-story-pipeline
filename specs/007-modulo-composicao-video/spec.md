# Feature Specification: Módulo de Composição de Vídeo (ffmpeg)

**Feature Branch**: `007-modulo-composicao-video`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Módulo de composição de vídeo: juntar narração + vídeo de fundo + legenda em um único MP4 vertical (1080x1920), pronto para revisão manual."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Montar o vídeo final a partir da narração, fundo e legenda (Priority: P1)

Como responsável por preparar cada história para revisão manual, quero
juntar a narração já gerada, um vídeo de fundo e a legenda sincronizada
em um único arquivo de vídeo vertical, para poder assistir o resultado
final e decidir se ele está pronto para publicar.

**Why this priority**: É o momento em que todos os insumos das fases
anteriores (narração, legenda, vídeo de fundo) se tornam o produto final
— sem essa montagem, não existe vídeo para revisar.

**Independent Test**: Pode ser testado isoladamente: fornecer um áudio de
narração real, um vídeo de fundo real e uma legenda `.srt` real, e
confirmar que o resultado é um único arquivo de vídeo vertical, com
duração compatível com a narração, legenda visível e sincronizada, e
áudio/vídeo não perceptivelmente dessincronizados.

**Acceptance Scenarios**:

1. **Given** um áudio de narração, um vídeo de fundo e uma legenda,
   **When** a composição é executada, **Then** um único arquivo de vídeo
   em formato retrato (mais alto do que largo) é gerado.
2. **Given** o vídeo de fundo mais curto ou mais longo que a narração,
   **When** a composição é executada, **Then** a duração do vídeo final
   acompanha a duração da narração (o fundo é repetido ou cortado
   conforme necessário).
3. **Given** o vídeo final gerado, **When** ele é assistido, **Then** a
   legenda aparece embutida no vídeo e sincronizada com a fala.
4. **Given** o vídeo final gerado, **When** ele é assistido, **Then** o
   áudio e o vídeo não aparentam estar fora de sincronia.

---

### User Story 2 - Saber exatamente o que faltou quando a composição falha (Priority: P2)

Como responsável por rodar a geração de vídeos em lote, quando algum dos
arquivos de entrada (narração, vídeo de fundo, legenda) não existe ou
está inacessível, quero um erro que identifique claramente qual arquivo
está faltando, para corrigir o problema rapidamente em vez de investigar
uma falha genérica de composição.

**Why this priority**: Sem um erro identificável, uma falha de composição
por arquivo ausente (ex: geração de legenda que falhou silenciosamente
antes) fica difícil de diagnosticar, atrasando a geração do vídeo do dia.

**Independent Test**: Pode ser testado apontando a composição para um
caminho de arquivo de entrada inexistente e confirmando que o erro
recebido identifica qual arquivo não foi encontrado.

**Acceptance Scenarios**:

1. **Given** um dos arquivos de entrada (narração, vídeo de fundo ou
   legenda) apontando para um caminho inexistente, **When** a composição
   é executada, **Then** um erro claro é lançado antes ou durante o
   processamento, identificando qual arquivo de entrada está faltando.

### Edge Cases

- O que acontece se a legenda estiver vazia (nenhuma linha)? (O vídeo
  ainda deve ser gerado, apenas sem texto sobreposto — não é uma falha.)
- O que acontece se o vídeo de fundo já for mais longo que a narração?
  (O vídeo final deve ser cortado no ponto em que a narração termina, não
  continuar além disso.)
- O que acontece com um caminho de legenda contendo caracteres especiais
  que a sintaxe de filtro de vídeo interpreta de forma especial? (Fora do
  escopo desta fase — assume-se que os caminhos gerados pelo próprio
  pipeline (fases 05, 09) não contêm esses caracteres.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST juntar um áudio de narração, um vídeo de
  fundo e uma legenda em um único arquivo de vídeo.
- **FR-002**: O vídeo final MUST estar em formato retrato (1080x1920).
- **FR-003**: O vídeo de fundo MUST ser cortado (centralizado) e/ou
  repetido conforme necessário para preencher exatamente a duração da
  narração — nem mais curto, nem mais longo.
- **FR-004**: A legenda MUST aparecer embutida no vídeo final, visível e
  sincronizada com a fala.
- **FR-005**: O áudio e o vídeo do resultado final MUST permanecer
  sincronizados, sem atraso perceptível entre fala e legenda/imagem.
- **FR-006**: Se qualquer um dos arquivos de entrada (narração, vídeo de
  fundo, legenda) não existir ou estiver inacessível, o sistema MUST
  lançar um erro que identifique qual arquivo de entrada é o problema.

### Key Entities

- **Vídeo composto (ComposedVideo)**: representa o resultado final desta
  fase — um único arquivo de vídeo vertical, pronto para entrar na fila
  de revisão manual (fase 09).
- **Insumos de composição**: os três arquivos de entrada — caminho do
  áudio de narração, caminho do vídeo de fundo, caminho da legenda — mais
  o caminho de saída desejado para o vídeo final.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um vídeo final é gerado a partir de insumos reais (fases
  03/04, 05, 06) sem intervenção manual, em formato retrato.
- **SC-002**: A duração do vídeo final é igual à duração da narração em
  100% dos casos testados, independentemente de o vídeo de fundo ser mais
  curto ou mais longo que a narração.
- **SC-003**: Ao assistir o vídeo final, a legenda e o áudio aparentam
  estar sincronizados o suficiente para não incomodar quem assiste
  (validação por checagem manual/auditiva).
- **SC-004**: 100% das tentativas de composição com um arquivo de entrada
  ausente resultam em um erro que identifica exatamente qual arquivo
  faltou, nunca em uma falha genérica sem contexto.

## Assumptions

- Estilo visual avançado de legenda (fonte customizada, animação palavra
  a palavra com destaque de cor) está fora de escopo desta fase — a
  versão inicial usa a apresentação padrão de legenda embutida. Se o
  estilo "palavra destacada" for essencial, isso é tratado como uma fase
  extra futura, usando os timestamps por palavra já produzidos na fase 05
  em vez de só o `.srt`.
- Marca d'água, intro/outro e transições estão fora de escopo desta fase.
- Os arquivos de entrada (narração, vídeo de fundo, legenda) já foram
  produzidos pelas fases anteriores (03/04, 05, 06) — esta fase não os
  gera, só os combina.
