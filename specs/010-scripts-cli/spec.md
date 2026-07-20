# Feature Specification: Scripts CLI (os 3 caminhos da revisão)

**Feature Branch**: `010-scripts-cli`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Scripts CLI: expor os pontos de entrada que você roda de fato pelo terminal — gerar lote de vídeos, e decidir o destino de cada um após assistir (publicar, regenerar com ElevenLabs, ou descartar)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gerar um lote de vídeos com um único comando (Priority: P1)

Como responsável por alimentar a fila de revisão, quero rodar um único
comando que busca histórias e gera um vídeo para cada uma, para não
precisar orquestrar manualmente a busca e o processamento de cada
história.

**Why this priority**: É o ponto de entrada que inicia todo o ciclo —
sem ele, não há vídeos para revisar nos outros dois caminhos.

**Independent Test**: Pode ser testado isoladamente: rodar o comando de
geração e confirmar que uma pasta aparece em `pending-review` para cada
história processada com sucesso.

**Acceptance Scenarios**:

1. **Given** um lote de histórias disponível, **When** o comando de
   geração é executado, **Then** uma pasta pronta para revisão aparece
   para cada história processada com sucesso.

---

### User Story 2 - Decidir o destino de um vídeo já revisado (Priority: P1)

Como responsável por revisar cada vídeo gerado, depois de assistir,
quero rodar um comando simples informando o identificador do job para
publicar, descartar, ou regenerar a narração com o provedor de qualidade
superior, para completar a decisão sem precisar mexer em código.

**Why this priority**: É o propósito central desta fase — transformar a
decisão humana (assistir e decidir) em uma ação de uma linha de comando.

**Independent Test**: Pode ser testado isoladamente para cada um dos três
comandos: publicar um job pendente, descartar um job pendente, e
regenerar a narração de um job pendente — cada um verificável pelo estado
resultante das pastas (ou pela criação de um novo job, no caso da
regeneração).

**Acceptance Scenarios**:

1. **Given** o identificador de um job pendente, **When** o comando de
   publicação é executado, **Then** o job passa a existir no estado
   publicado.
2. **Given** o identificador de um job pendente, **When** o comando de
   descarte é executado, **Then** o job passa a existir no estado
   descartado.
3. **Given** o identificador de um job pendente cuja narração local não
   ficou boa, **When** o comando de regeneração é executado, **Then** um
   **novo** job é criado, com narração gerada pelo provedor de qualidade
   superior, pronto para uma revisão rápida.

---

### User Story 3 - Não quebrar de forma confusa quando o comando é usado incorretamente (Priority: P2)

Como responsável por operar os comandos manualmente, quando esqueço de
passar o identificador do job ou tento repetir uma decisão já tomada,
quero uma mensagem de uso clara, para corrigir o comando na hora, em vez
de investigar um erro técnico obscuro.

**Why this priority**: Sem mensagens de uso claras, cada engano na
digitação do comando vira uma pequena investigação, atrasando o fluxo de
revisão que deveria ser rápido.

**Independent Test**: Pode ser testado chamando cada comando sem o
identificador do job, e confirmando que a mensagem exibida explica como
usar o comando corretamente.

**Acceptance Scenarios**:

1. **Given** qualquer um dos três comandos de decisão, **When** ele é
   chamado sem informar o identificador do job, **Then** uma mensagem de
   uso clara é exibida e o comando termina sem executar nenhuma ação.
2. **Given** um job já publicado, **When** o comando de publicação é
   executado novamente para o mesmo identificador, **Then** o comando
   falha com uma mensagem clara, em vez de completar silenciosamente ou
   travar com um erro obscuro.

### Edge Cases

- O que acontece se uma variável de ambiente obrigatória (ex: chave de
  API) não estiver configurada quando um comando é executado? (Deve
  falhar com uma mensagem que identifique a configuração ausente, não com
  um erro técnico obscuro no meio da execução.)
- O que acontece se o comando de geração não encontrar nenhuma história
  que atenda aos critérios de busca? (Deve terminar normalmente, sem
  gerar nenhuma pasta, e sem ser tratado como uma falha.)
- O que acontece se o comando de regeneração for usado em um job que já
  foi aprovado ou publicado (não está mais pendente)? (Deve falhar com
  mensagem clara, já que a história original não está mais acessível
  pelo caminho de leitura de jobs pendentes.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST expor um comando que busca histórias e gera
  um vídeo para cada uma, sem exigir nenhuma etapa manual intermediária.
- **FR-002**: O sistema MUST expor um comando que, dado o identificador de
  um job, move seu vídeo para o estado publicado.
- **FR-003**: O sistema MUST expor um comando que, dado o identificador de
  um job, move seu vídeo para o estado descartado.
- **FR-004**: O sistema MUST expor um comando que, dado o identificador de
  um job pendente, gera uma nova narração com o provedor de qualidade
  superior e cria um **novo** job para revisão rápida, sem alterar ou
  remover o job original.
- **FR-005**: Os três comandos de decisão (publicar, descartar, regenerar)
  MUST exibir uma mensagem de uso clara e terminar sem executar nenhuma
  ação quando o identificador do job não for informado.
- **FR-006**: Repetir um comando de decisão para um job que já não está
  mais no estado de origem esperado MUST falhar com uma mensagem clara,
  não silenciosamente nem com um erro obscuro.

### Key Entities

- **Comando de geração**: ponto de entrada que não recebe identificador
  de job — opera sobre um lote de histórias buscadas na hora.
- **Comando de decisão**: cada um dos três comandos (publicar, descartar,
  regenerar) que recebem um identificador de job como argumento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Rodar o comando de geração produz uma pasta pronta para
  revisão para cada história processada com sucesso, sem intervenção
  manual.
- **SC-002**: Cada um dos três comandos de decisão produz o efeito
  esperado (publicado, descartado, ou novo job de regeneração) em 100%
  das execuções com um job válido no estado de origem esperado.
- **SC-003**: 100% das execuções sem o identificador do job resultam em
  mensagem de uso clara, sem nenhuma alteração de estado nas pastas.
- **SC-004**: 100% das tentativas de repetir uma decisão já tomada
  resultam em erro identificável, nunca em sucesso silencioso.

## Assumptions

- Upload real para as plataformas (Instagram/TikTok/YouTube) está fora de
  escopo desta fase — o comando de publicação move o vídeo para o estado
  publicado; o upload em si permanece manual até uma fase futura (fase
  11, backlog).
- Não há agendamento automático (cron) nesta fase — todos os comandos são
  disparados manualmente por quem opera o pipeline.
- A descrição de cena usada na busca de vídeo de fundo é fixa/manual
  nesta fase (consistente com a fase 06) — variar essa descrição
  automaticamente fica para uma fase futura.
