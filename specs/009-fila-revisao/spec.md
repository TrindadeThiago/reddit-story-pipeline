# Feature Specification: Fila de Revisão Manual

**Feature Branch**: `009-fila-revisao`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Fila de revisão manual: guardar cada vídeo pronto em uma pasta previsível, para que a revisão manual (decisão entre os 3 caminhos) seja simplesmente abrir o arquivo e rodar um comando."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Encontrar cada vídeo pronto em um lugar previsível para revisar (Priority: P1)

Como responsável por revisar os vídeos gerados, quero que cada história
processada apareça em uma pasta própria e previsível assim que estiver
pronta, para poder simplesmente abrir a pasta, assistir o vídeo e decidir
o que fazer, sem precisar caçar arquivos espalhados.

**Why this priority**: É o ponto de contato entre a geração automática
(fases 02–08) e a decisão humana — sem uma fila previsível, a revisão
manual não tem como funcionar de forma confiável.

**Independent Test**: Pode ser testado isoladamente: enfileirar um job
processado e confirmar que uma pasta correspondente aparece com os dados
do job acessíveis, prontos para reconstrução posterior.

**Acceptance Scenarios**:

1. **Given** um job processado (com narração, legenda e vídeo prontos),
   **When** ele é enfileirado para revisão, **Then** uma pasta própria
   para aquele job passa a existir, contendo os metadados do job e os
   arquivos gerados.
2. **Given** um job já enfileirado, **When** seus dados são lidos de
   volta, **Then** a história original e os demais metadados são
   reconstruídos exatamente como enfileirados.

---

### User Story 2 - Mover um job entre os estados de decisão sem duplicar dados (Priority: P1)

Como responsável por decidir o destino de cada vídeo revisado, quero
mover um job entre os estados "pendente", "aprovado", "publicado" e
"descartado" através de comandos simples, sem que sobre nenhuma cópia
esquecida no estado anterior, para manter a organização das pastas
confiável ao longo do tempo.

**Why this priority**: Sem movimentação limpa entre estados, as pastas
acumulariam duplicatas e o estado real de cada vídeo (o que já foi
decidido, o que ainda está pendente) ficaria ambíguo.

**Independent Test**: Pode ser testado enfileirando um job e percorrendo
os dois caminhos possíveis — aprovar e depois publicar; ou descartar
diretamente — e confirmando que a pasta sempre existe em exatamente um
lugar por vez.

**Acceptance Scenarios**:

1. **Given** um job pendente, **When** ele é aprovado, **Then** a pasta
   passa a existir no estado "aprovado" e não existe mais no estado
   "pendente".
2. **Given** um job aprovado, **When** ele é publicado, **Then** a pasta
   passa a existir no estado "publicado" e não existe mais no estado
   "aprovado".
3. **Given** um job pendente, **When** ele é descartado, **Then** a pasta
   passa a existir no estado "descartado" e não existe mais no estado
   "pendente".

---

### User Story 3 - Saber quando uma decisão é aplicada a um job que não existe mais (Priority: P2)

Como responsável por operar o fluxo de revisão manualmente, quando tento
mover um job que já foi movido antes (ou nunca existiu), quero um erro
claro, para perceber imediatamente que já tomei essa decisão ou que
digitei o identificador errado, em vez de um comando que silenciosamente
não faz nada.

**Why this priority**: Sem um erro claro, repetir um comando por engano
(ex: publicar duas vezes) passaria despercebido, tornando o estado real
das pastas incerto.

**Independent Test**: Pode ser testado tentando mover um identificador de
job que não existe no estado de origem esperado, e confirmando que a
operação falha com uma mensagem identificável, em vez de completar
silenciosamente ou travar com um erro confuso.

**Acceptance Scenarios**:

1. **Given** um identificador de job que não existe no estado de origem
   esperado, **When** uma operação de movimentação é tentada, **Then**
   um erro claro é lançado, identificando o job e a operação que falhou.

### Edge Cases

- O que acontece se `enqueueForReview` for chamado antes de a pasta de
  destino existir no sistema de arquivos? (Não deve depender de outra
  etapa ter criado a pasta antes — a própria função é responsável por
  garantir que a pasta exista.)
- O que acontece se dois jobs tiverem o mesmo identificador? (Fora de
  escopo desta fase — a geração de identificador único é responsabilidade
  do orquestrador, fase 08.)
- O que acontece se a revisão manual demorar dias e o processo que gerou
  o job já não estiver mais rodando? (Não é um problema — a fila é
  baseada em arquivos persistentes no disco, não em memória de processo.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST guardar cada job enfileirado em uma pasta
  própria e previsível (identificável pelo identificador do job),
  contendo seus metadados e os arquivos gerados.
- **FR-002**: `enqueueForReview` MUST garantir a existência da pasta de
  destino por conta própria, sem depender de outra etapa já tê-la
  criado.
- **FR-003**: O sistema MUST permitir reconstruir os metadados completos
  de um job pendente a partir de sua pasta, incluindo a história
  original.
- **FR-004**: O sistema MUST permitir mover um job entre os estados
  pendente → aprovado → publicado, e pendente → descartado.
- **FR-005**: Cada movimentação entre estados MUST resultar na pasta
  existindo em exatamente um lugar — nunca duplicada entre o estado de
  origem e o de destino.
- **FR-006**: Tentar mover um job cujo identificador não existe no estado
  de origem esperado MUST lançar um erro claro, identificando o job e a
  operação.

### Key Entities

- **Job na fila de revisão**: representa uma pasta contendo os metadados
  de um `PipelineJob` (história, narração, legenda, vídeo) e os arquivos
  gerados, localizada em um dos quatro estados: pendente, aprovado,
  publicado, descartado.
- **Estado do job**: um dos quatro diretórios de destino possíveis —
  cada job existe em exatamente um estado por vez.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Após enfileirar um job, 100% dos metadados e arquivos
  gerados ficam acessíveis em uma única pasta previsível, sem exigir
  nenhuma etapa manual adicional.
- **SC-002**: Em qualquer momento, um job existe em exatamente um dos
  quatro estados — nunca em zero (perdido) nem em mais de um
  (duplicado).
- **SC-003**: 100% das tentativas de mover um job inexistente no estado
  de origem resultam em um erro identificável, nunca em uma operação
  silenciosamente sem efeito.
- **SC-004**: O ciclo completo (enfileirar → ler → aprovar → publicar) e
  o ciclo alternativo (enfileirar → descartar) completam sem
  intervenção manual além dos comandos de decisão.

## Assumptions

- Não há interface visual de revisão nesta fase — a revisão é feita
  abrindo a pasta manualmente e assistindo ao vídeo; um painel web fica
  como possível fase futura se o volume justificar.
- Não há notificação automática de que um novo job está pronto para
  revisão — quem opera o pipeline verifica a pasta manualmente ou por
  meio dos scripts da fase 10.
- A geração do identificador único de cada job é responsabilidade do
  orquestrador (fase 08) — esta fase apenas usa o identificador recebido,
  sem validá-lo ou gerá-lo.
