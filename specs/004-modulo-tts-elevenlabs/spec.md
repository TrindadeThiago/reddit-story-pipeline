# Feature Specification: Módulo TTS — ElevenLabs + controle de cota

**Feature Branch**: `004-modulo-tts-elevenlabs`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Módulo TTS: ElevenLabs + controle de cota. Gerar narração com ElevenLabs (voz de qualidade superior ao Piper), usada apenas no caminho 2 da revisão manual ('aprovado, mas Piper ficou fraco'), com controle de cota mensal para não estourar o free tier sem perceber."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Regenerar narração com qualidade superior quando o Piper não convence (Priority: P1)

Como responsável por revisar os vídeos gerados, quando assisto a um vídeo
e a narração do provedor local (Piper) saiu fraca, quero poder regenerar
a mesma história com um provedor de narração de qualidade superior, para
salvar o vídeo sem precisar descartar uma boa história por causa só do
áudio.

**Why this priority**: É o motivo de existir desta fase — sem ela, toda
história com narração fraca no caminho padrão precisaria ser descartada,
mesmo que a história em si fosse boa.

**Independent Test**: Pode ser testado isoladamente: chamar a síntese com
um texto real e confirmar que ela produz um arquivo de áudio válido em
português, usando o mesmo contrato de narração que o restante do pipeline
já espera (definido na fase 03).

**Acceptance Scenarios**:

1. **Given** um texto de narração e um caminho de destino, **When** a
   síntese é executada com o provedor de qualidade superior, **Then** um
   arquivo de áudio válido em português passa a existir nesse caminho.
2. **Given** o resultado da síntese, **When** ele é inspecionado, **Then**
   identifica claramente que foi este provedor (não o local) que gerou o
   áudio.

---

### User Story 2 - Nunca estourar a cota mensal gratuita sem perceber (Priority: P1)

Como responsável por manter o custo do pipeline em zero (ou dentro do
plano gratuito), quero que o sistema me impeça de gastar mais caracteres
do que o limite mensal configurado, para não ser surpreendido com uma
cobrança ou um bloqueio de conta no meio do mês.

**Why this priority**: Sem esse controle, o uso do provedor de qualidade
superior é arriscado o suficiente para desencorajar seu uso mesmo nos
casos em que ele resolveria o problema — o controle de cota é o que torna
essa fase segura de usar no dia a dia.

**Independent Test**: Pode ser testado configurando um limite mensal
baixo, gastando cota até perto do limite, e confirmando que uma tentativa
de sintetizar um texto que ultrapassaria o limite é bloqueada antes de
qualquer chamada ao serviço externo — ou seja, sem gastar créditos reais.

**Acceptance Scenarios**:

1. **Given** um limite mensal configurado e uso acumulado já registrado,
   **When** uma nova síntese pediria mais caracteres do que o saldo
   restante, **Then** a operação é bloqueada com um erro claro **antes**
   de qualquer chamada ao serviço externo — nenhum crédito é gasto.
2. **Given** o uso acumulado do mês, **When** o mês civil muda, **Then**
   o contador de uso reinicia automaticamente, sem exigir ação manual.
3. **Given** um processo que é reiniciado, **When** uma nova síntese é
   solicitada logo em seguida, **Then** o sistema ainda sabe quanto já foi
   usado no mês corrente (o estado de cota sobrevive ao reinício).

### Edge Cases

- O que acontece se uma síntese falhar no meio do processo (ex: erro do
  serviço externo) depois que a checagem de cota já liberou a operação?
  (O uso só deve ser contabilizado após sucesso confirmado, não antes —
  para não descontar cota de uma síntese que não gerou áudio nenhum.)
- O que acontece se o arquivo de estado da cota estiver corrompido ou
  ilegível? (Deve ser tratado sem travar o processo indefinidamente —
  hoje o comportamento razoável é tratar como "sem uso registrado ainda"
  e seguir, mas isso é uma decisão a confirmar.)
- O que acontece se duas sínteses forem chamadas quase ao mesmo tempo,
  perto do limite? (Fora de escopo desta fase — não há controle de
  concorrência entre chamadas simultâneas.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST gerar um arquivo de áudio válido em
  português a partir de um texto e um caminho de destino, usando o
  provedor de narração de qualidade superior.
- **FR-002**: O resultado da síntese MUST identificar de forma
  padronizada que foi o provedor de qualidade superior (não o local) que
  gerou o áudio, seguindo o mesmo contrato definido na fase 03.
- **FR-003**: O sistema MUST verificar, antes de qualquer chamada ao
  serviço externo, se a síntese solicitada cabe dentro do saldo restante
  da cota mensal configurada.
- **FR-004**: Uma síntese que ultrapassaria o limite mensal MUST ser
  bloqueada com um erro claro, sem que nenhuma chamada ao serviço externo
  seja feita (nenhum crédito gasto).
- **FR-005**: O uso de cota MUST ser contabilizado somente após a síntese
  ser confirmada como bem-sucedida — nunca antes, e nunca em caso de
  falha da síntese.
- **FR-006**: O contador de uso mensal MUST reiniciar automaticamente
  quando o mês civil muda, sem exigir intervenção manual.
- **FR-007**: O estado de uso da cota MUST persistir entre reinícios do
  processo — reiniciar a aplicação não deve zerar o controle de cota do
  mês corrente.

### Key Entities

- **Cota de caracteres**: representa quantos caracteres já foram usados
  no mês corrente e o limite mensal configurado. Usada para decidir se
  uma nova síntese pode prosseguir.
- **Resultado de narração**: mesmo conceito da fase 03 — inclui qual
  provedor gerou o áudio (agora podendo ser o de qualidade superior),
  caminho do arquivo e caracteres usados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma síntese com o provedor de qualidade superior produz um
  áudio válido em português a partir de um texto real, usando a mesma
  interface que o restante do pipeline já consome (fase 03).
- **SC-002**: 100% das tentativas de síntese que estourariam a cota
  mensal são bloqueadas antes de qualquer chamada ao serviço externo —
  zero créditos gastos em tentativas bloqueadas.
- **SC-003**: O controle de cota permanece correto após reiniciar o
  processo — o saldo restante logo após reiniciar é igual ao saldo antes
  de reiniciar.
- **SC-004**: No primeiro dia de um novo mês civil, uma síntese que
  estouraria o limite do mês anterior é aceita normalmente (contador
  zerado), sem exigir nenhuma ação manual de quem opera o pipeline.

## Assumptions

- Este provedor só é usado sob demanda, no caminho de regeneração após
  revisão manual (não no fluxo automático em lote) — o volume de uso é
  naturalmente baixo, o que torna um limite mensal gratuito viável.
- Não há, nesta fase, upgrade automático de plano nem alertas por
  e-mail/notificação quando a cota estiver perto de acabar — o sistema só
  bloqueia a chamada quando o limite seria estourado.
- Não há cache ou reaproveitamento de áudio já gerado para o mesmo texto
  — cada chamada de regeneração gasta cota novamente, mesmo que o texto
  seja idêntico a uma síntese anterior.
- O contrato de narração (`TtsProvider`) definido na fase 03 não muda —
  esta fase só adiciona uma segunda implementação dele.
