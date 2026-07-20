# Feature Specification: Orquestrador do Pipeline

**Feature Branch**: `008-orquestrador-pipeline`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Orquestrador do pipeline: encadear as fases 02–07 em um fluxo único por história: texto → narração → legenda → vídeo montado → enfileirado para revisão."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Transformar uma história em vídeo pronto para revisão, de ponta a ponta (Priority: P1)

Como responsável por gerar vídeos a partir de histórias do Reddit, quero
que uma única chamada leve uma história do texto bruto até um vídeo
montado e enfileirado para revisão manual, para não precisar encadear
manualmente narração, legenda, vídeo de fundo e composição a cada vez.

**Why this priority**: É a espinha dorsal do pipeline — sem o
orquestrador, cada história exigiria chamar manualmente cada fase na
ordem certa, propenso a erro e sem reaproveitamento entre o fluxo normal
e o de regeneração.

**Independent Test**: Pode ser testado isoladamente: fornecer uma
história real e as dependências configuradas (provedor de narração,
chave de API de vídeo de fundo, tamanho do modelo de legenda, descrição
de cena), e confirmar que o resultado é um job completo — narração,
legenda e vídeo preenchidos — já enfileirado para revisão.

**Acceptance Scenarios**:

1. **Given** uma história real e um provedor de narração local
   configurado, **When** o pipeline é executado para essa história,
   **Then** o resultado é um job completo com narração, legenda e vídeo
   preenchidos, e o job já foi enfileirado para revisão manual.
2. **Given** um identificador único gerado para a execução, **When** o
   pipeline roda para a mesma história mais de uma vez, **Then** cada
   execução produz um identificador de job diferente (nenhuma
   sobrescreve a outra).

---

### User Story 2 - Reaproveitar o mesmo fluxo com um provedor de narração diferente (Priority: P1)

Como responsável por regenerar uma história cuja narração local não ficou
boa, quero rodar o mesmo fluxo de ponta a ponta trocando apenas o
provedor de narração, para não duplicar a lógica de orquestração entre o
caminho normal e o caminho de regeneração.

**Why this priority**: Sem essa reutilização, o caminho de regeneração
(fase 10) precisaria duplicar toda a lógica de encadeamento das fases
02–07, dobrando a superfície de manutenção e o risco de os dois fluxos
divergirem com o tempo.

**Independent Test**: Pode ser testado chamando o mesmo fluxo duas vezes
para a mesma história, uma vez com um provedor de narração e outra com
outro, e confirmando que a estrutura do resultado é idêntica nos dois
casos — só o conteúdo da narração muda.

**Acceptance Scenarios**:

1. **Given** a mesma história, **When** o pipeline roda uma vez com o
   provedor de narração local e outra vez com o provedor de qualidade
   superior, **Then** ambas as execuções produzem um job com a mesma
   estrutura (narração, legenda e vídeo preenchidos), sem exigir nenhuma
   alteração no código do fluxo em si.

---

### User Story 3 - Entender qual etapa falhou quando o pipeline não completa (Priority: P2)

Como responsável por rodar a geração de vídeos em lote, quando uma
história falha no meio do processamento (ex: nenhum vídeo de fundo
encontrado), quero saber exatamente em qual etapa a falha ocorreu, para
corrigir o problema sem precisar investigar o fluxo inteiro do zero.

**Why this priority**: Sem contexto sobre a etapa que falhou, diagnosticar
um problema em lote (várias histórias processadas de uma vez) fica lento
e frustrante — importante mas secundário ao fluxo funcionar no caminho
feliz.

**Independent Test**: Pode ser testado forçando uma falha em uma das
etapas (ex: vídeo de fundo não encontrado) e confirmando que o erro
recebido identifica qual etapa do fluxo (narração, legenda, vídeo de
fundo, composição, enfileiramento) estava em andamento quando a falha
ocorreu.

**Acceptance Scenarios**:

1. **Given** uma etapa do fluxo que falha (ex: busca de vídeo de fundo
   sem resultado), **When** o pipeline é executado, **Then** o erro
   propagado identifica em qual etapa a falha ocorreu, além do motivo
   original da falha.

### Edge Cases

- O que acontece se a etapa de composição de vídeo (fase 07) receber um
  vídeo de fundo que ainda não foi baixado localmente, apenas uma URL
  remota? (Precisa ficar claro se a composição consome a URL diretamente
  ou se o orquestrador precisa baixar o arquivo antes — ver Assumptions.)
- O que acontece se o processo for interrompido no meio de uma execução
  (ex: falha de energia)? (Fora de escopo desta fase — não há
  recuperação/retomada de uma execução parcial.)
- O que acontece se duas histórias forem processadas ao mesmo tempo? (Fora
  de escopo — o volume atual assume processamento de uma história por
  vez, não paralelo.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST encadear, para uma única história, a
  geração de narração, a geração de legenda, a busca de vídeo de fundo, a
  composição do vídeo final e o enfileiramento para revisão, nessa ordem
  lógica de dependência.
- **FR-002**: O sistema MUST gerar um identificador único por execução,
  de forma que duas execuções para a mesma história nunca colidam.
- **FR-003**: O provedor de narração usado em cada execução MUST ser
  configurável (injetado), permitindo reutilizar o mesmo fluxo tanto no
  caminho normal quanto no caminho de regeneração, sem duplicar lógica de
  orquestração.
- **FR-004**: Ao final de uma execução bem-sucedida, o job resultante
  MUST estar enfileirado para revisão manual, com narração, legenda e
  vídeo preenchidos.
- **FR-005**: Se qualquer etapa do fluxo falhar, o erro propagado MUST
  identificar em qual etapa a falha ocorreu, além do motivo original.
- **FR-006**: O vídeo de fundo encontrado pela busca (fase 06) MUST estar
  disponível localmente antes de a etapa de composição de vídeo (fase 07)
  ser executada, já que a composição opera sobre arquivos locais.

### Key Entities

- **Job do pipeline (PipelineJob)**: representa o estado de uma execução
  completa para uma história — identificador, história original,
  narração, legenda e vídeo, à medida que cada etapa vai preenchendo seu
  respectivo campo.
- **Dependências de execução**: o conjunto de configurações injetadas em
  cada execução — qual provedor de narração usar, credenciais/parâmetros
  de vídeo de fundo, tamanho do modelo de legenda e descrição de cena.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma história real processada de ponta a ponta produz um
  vídeo enfileirado para revisão sem nenhuma intervenção manual entre as
  etapas.
- **SC-002**: Trocar o provedor de narração entre duas execuções não
  exige nenhuma alteração no código do orquestrador — só na configuração
  injetada.
- **SC-003**: 100% das falhas em qualquer etapa do fluxo resultam em um
  erro que identifica a etapa específica, nunca uma falha genérica sem
  contexto sobre onde o processamento parou.
- **SC-004**: Duas execuções da mesma história produzem identificadores
  de job diferentes em 100% dos casos.

## Assumptions

- A seleção/curadoria de qual história processar é decisão de quem chama
  o orquestrador (ex: o script da fase 10) — esta fase não busca nem
  filtra histórias, apenas processa a que for informada.
- Paralelismo entre histórias está fora de escopo — processar uma história
  de cada vez é aceitável no volume atual ("alguns vídeos por dia").
- A composição de vídeo (fase 07) opera sobre arquivos locais; como a
  busca de vídeo de fundo (fase 06) retorna apenas uma URL remota, o
  orquestrador é responsável por garantir que o arquivo esteja disponível
  localmente antes de chamar a composição (ver FR-006).
