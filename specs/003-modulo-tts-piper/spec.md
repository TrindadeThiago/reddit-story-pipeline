# Feature Specification: Módulo TTS — Piper + interface plugável

**Feature Branch**: `003-modulo-tts-piper`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Módulo TTS: Piper + interface plugável. Gerar narração em áudio a partir de texto, usando Piper (local, gratuito, sem limite de cota), e definir o contrato TtsProvider que também será implementado pelo ElevenLabs na fase 04."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gerar narração local e gratuita a partir do texto da história (Priority: P1)

Como responsável por transformar uma história do Reddit em vídeo, quero
converter o texto completo da história em um arquivo de áudio narrado em
português, sem depender de um serviço pago e sem me preocupar com limite
de uso, para poder gerar quantos vídeos eu quiser no fluxo padrão do
pipeline.

**Why this priority**: É o caminho padrão de narração de todo o pipeline
— sem ele, nenhuma história vira vídeo. O caminho pago (ElevenLabs, fase
04) é só uma alternativa de qualidade para casos específicos, usada por
cima deste.

**Independent Test**: Pode ser testado isoladamente: passar um texto real
de história (2000+ caracteres) e um caminho de saída, e confirmar que o
arquivo de áudio resultante existe, é válido, está em português e cobre o
texto inteiro (não só um trecho).

**Acceptance Scenarios**:

1. **Given** um texto de narração e um caminho de arquivo de destino,
   **When** a narração é gerada, **Then** um arquivo de áudio válido
   passa a existir nesse caminho.
2. **Given** o áudio gerado, **When** ele é reproduzido, **Then** a fala
   está em português (voz configurada para pt-BR).
3. **Given** um texto longo (uma história inteira do Reddit, não uma
   frase curta de teste), **When** a narração é gerada, **Then** o áudio
   resultante cobre o texto completo, sem cortar no meio.

---

### User Story 2 - Trocar de provedor de narração sem alterar o restante do pipeline (Priority: P2)

Como responsável por evoluir o pipeline, quero que a geração de narração
siga um contrato único e estável, para que a fase 04 (ElevenLabs) e o
orquestrador (fase 08) possam usar qualquer provedor de narração sem
precisar saber os detalhes de cada um.

**Why this priority**: Sem um contrato estável, cada nova fonte de
narração (ElevenLabs, e outras futuras) exigiria alterar o orquestrador e
os pontos que consomem o resultado — alto custo de manutenção e risco de
quebrar o fluxo já funcionando.

**Independent Test**: Pode ser testado conferindo que o resultado da
narração sempre identifica de forma padronizada qual provedor gerou o
áudio, e que o consumidor do resultado (ex: fase de legendas) não precisa
de nenhum código específico para "caso seja Piper".

**Acceptance Scenarios**:

1. **Given** uma narração gerada pelo provedor local, **When** o
   resultado é inspecionado, **Then** ele identifica claramente que foi
   este provedor que gerou o áudio.
2. **Given** o mesmo texto e caminho de saída, **When** a chamada é feita
   através do contrato comum (não de uma API específica do provedor),
   **Then** o comportamento observável (arquivo de áudio válido no
   caminho informado) é o mesmo, independentemente de qual provedor está
   por trás.

### Edge Cases

- O que acontece se o texto de entrada estiver vazio? (Não coberto por
  esta fase — a limpeza/validação do texto antes de chamar a narração é
  responsabilidade de quem chama, fora deste módulo.)
- O que acontece se o caminho de saída não puder ser escrito (permissão,
  diretório inexistente)? (Deve falhar de forma identificável, não
  silenciosamente.)
- Como o sistema se comporta com um texto muito longo (uma história bem
  acima da média)? (Deve gerar o áudio completo; não há limite de
  tamanho definido nesta fase além do que a ferramenta local suportar.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST gerar um arquivo de áudio válido a partir de
  um texto e um caminho de destino informados.
- **FR-002**: A narração gerada MUST estar em português (voz pt-BR).
- **FR-003**: O sistema MUST suportar textos longos (história inteira),
  não apenas frases curtas de teste.
- **FR-004**: Todo resultado de narração MUST identificar de forma
  padronizada qual provedor gerou o áudio.
- **FR-005**: A geração de narração MUST ser exposta através de um
  contrato único e estável, que qualquer provedor de narração (local ou
  externo) implementa da mesma forma — este contrato não muda sem
  atualizar todas as fases que dependem dele (fase 04, fase 08).
- **FR-006**: O provedor local de narração MUST funcionar sem exigir
  autenticação, chave de API ou consumir cota de um serviço pago.

### Key Entities

- **Resultado de narração (NarrationResult)**: representa o áudio gerado
  a partir de um texto — inclui qual provedor gerou, o caminho do arquivo
  de áudio, e a quantidade de caracteres processados (útil para métricas
  e, na fase 04, para controle de cota).
- **Provedor de narração (TtsProvider)**: representa o contrato comum que
  qualquer fonte de narração (local ou externa) deve seguir — recebe um
  texto e um caminho de destino, devolve um resultado de narração.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um texto real de história do Reddit (2000+ caracteres) gera
  um arquivo de áudio válido e completo em português, sem exigir
  intervenção manual.
- **SC-002**: 100% das narrações geradas pelo provedor local não
  dependem de nenhuma credencial externa nem de conexão com um serviço
  pago — funcionam totalmente offline/local.
- **SC-003**: A fase 04 (ElevenLabs) e o orquestrador (fase 08) conseguem
  usar o resultado da narração sem nenhum código condicional específico
  para "se for o provedor local" — o contrato é suficiente.
- **SC-004**: Gerar a mesma narração duas vezes com o provedor local não
  incorre em custo monetário nem em consumo de cota — pode ser repetido
  livremente.

## Assumptions

- O pré-processamento do texto (limpeza de markdown do Reddit, remoção de
  links, quebra em blocos) é responsabilidade de quem chama a narração,
  não deste módulo — se o texto bruto do Reddit gerar áudio de qualidade
  ruim, isso pode virar uma fase extra futura, fora do escopo atual.
- A voz pt-BR usada pelo provedor local é escolhida/baixada como parte da
  configuração do ambiente (fase 001), não decidida em tempo de execução.
- Esta fase não cobre o provedor pago (ElevenLabs) — apenas garante que o
  contrato entre eles é compatível o suficiente para a fase 04 reutilizar
  sem alterações.
