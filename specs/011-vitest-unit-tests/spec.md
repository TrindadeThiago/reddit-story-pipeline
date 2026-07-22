# Feature Specification: Testes Unitarios com Vitest

**Feature Branch**: `011-vitest-unit-tests`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "implemente o vitest para criação de testes unitários, analise os arquivos dentro de src e quais devem ser testados, aquivos de tipagens e afins devem se ignorados, os testes devem ficarm no diretorio tests/ e ser uma copia da estrutura de src"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rodar a suite de testes unitarios com um unico comando (Priority: P1)

Como mantenedor do pipeline, quero executar `yarn test` (ou comando equivalente) e obter um relatorio claro de quais modulos de logica de negocio estao funcionando corretamente, para poder confiar em mudancas futuras sem quebrar o pipeline Reddit -> TTS -> legendas -> video -> revisao -> publicacao.

**Why this priority**: Sem uma ferramenta de teste configurada e funcionando, nenhuma outra historia desta feature pode ser entregue. E o alicerce de toda a iniciativa.

**Independent Test**: Pode ser testado executando o comando de teste do projeto em um checkout limpo e verificando que ele roda, reporta sucesso/falha por arquivo e termina com codigo de saida correto (0 para sucesso, diferente de 0 para falha).

**Acceptance Scenarios**:

1. **Given** o repositorio recem-clonado com dependencias instaladas, **When** o mantenedor executa o comando de teste do projeto, **Then** o executor de testes roda e apresenta um resumo (quantos testes passaram/falharam) sem erros de configuracao.
2. **Given** um teste com uma asserção que falha propositalmente, **When** a suite e executada, **Then** o resultado mostra a falha especifica (arquivo, teste, motivo) e o comando termina com codigo de saida de erro.

---

### User Story 2 - Estrutura de testes espelha a estrutura de codigo-fonte (Priority: P2)

Como mantenedor, quero que cada arquivo de logica dentro de `src/` tenha um arquivo de teste correspondente em `tests/`, seguindo o mesmo caminho relativo, para localizar rapidamente o teste de qualquer modulo sem precisar procurar em locais diferentes.

**Why this priority**: Depois que a ferramenta de testes esta funcionando (P1), organizar a suite de forma previsivel e o que torna a manutencao futura viavel e evita duplicidade ou testes "perdidos".

**Independent Test**: Pode ser testado comparando a arvore de diretorios de `src/` (excluindo arquivos de tipagem e barris de reexportacao) com a arvore de `tests/` e confirmando que cada arquivo elegivel possui um arquivo de teste no caminho espelhado.

**Acceptance Scenarios**:

1. **Given** um arquivo de logica em `src/modules/<modulo>/<arquivo>.ts`, **When** o mantenedor procura pelo teste correspondente, **Then** ele encontra o teste em `tests/modules/<modulo>/<arquivo>.test.ts` (ou nome equivalente reconhecido pelo executor).
2. **Given** um arquivo puramente de tipagem (ex.: `types.ts`) ou um arquivo de reexportacao (`index.ts` que apenas reexporta outros modulos), **When** a estrutura de `tests/` e revisada, **Then** nao existe um arquivo de teste correspondente para ele, pois nao ha logica a validar.

---

### User Story 3 - Cobertura de logica de negocio critica do pipeline (Priority: P3)

Como mantenedor, quero que os modulos com regras de negocio importantes (configuracao, geracao de legendas, provedores de TTS, selecao/indexacao de video de fundo, fila de revisao e busca de historias no Reddit) tenham testes unitarios que validem seus comportamentos principais e casos de borda, para detectar regressoes antes que cheguem a producao.

**Why this priority**: Ter a ferramenta configurada e a estrutura organizada nao entrega valor sozinho; o valor real vem de testes que efetivamente cobrem a logica que mais importa. Isso pode ser entregue de forma incremental apos P1 e P2.

**Independent Test**: Pode ser testado revisando o relatorio de execucao da suite e confirmando que cada modulo de logica listado possui pelo menos um teste que passa e que exercita um caminho de sucesso e um caso de erro/borda relevante.

**Acceptance Scenarios**:

1. **Given** a funcao de carregamento/validacao de configuracao (`config`), **When** variaveis de ambiente obrigatorias estao ausentes ou invalidas, **Then** um teste comprova que o comportamento de erro esperado ocorre.
2. **Given** a geracao de legendas e o destaque de palavras (`captions`), **When** entradas validas e invalidas sao fornecidas, **Then** testes comprovam a formatacao/estrutura de saida esperada.
3. **Given** os provedores de TTS (Piper/ElevenLabs) e o controle de cota, **When** chamadas externas sao simuladas (mock), **Then** testes comprovam o tratamento correto de sucesso, falha e limite de cota.
4. **Given** o indexador e o provedor de video de fundo local, **When** um pack de videos e simulado, **Then** testes comprovam a selecao/indexacao correta das cenas.
5. **Given** a fila de revisao (`reviewQueue`), **When** itens sao adicionados, aprovados ou descartados, **Then** testes comprovam as transicoes de estado esperadas.
6. **Given** a busca de historias no Reddit (`fetchStories`), **When** credenciais estao ausentes ou a resposta da API varia, **Then** os testes ja existentes para esse modulo continuam cobrindo esses casos apos a migracao para a nova estrutura.

---

### Edge Cases

- O que acontece quando um arquivo novo e adicionado em `src/` sem o teste correspondente em `tests/`? A suite deve continuar rodando normalmente, mas a lacuna de cobertura fica visivel para quem revisar a estrutura.
- Como o sistema lida com modulos que dependem de recursos externos (rede, sistema de arquivos, ffmpeg, chamadas HTTP para Reddit/ElevenLabs)? Esses recursos devem ser simulados (mock/stub) nos testes unitarios para que a suite rode de forma determinística e sem dependencias externas.
- O que acontece com arquivos que sao apenas barris de reexportacao (`index.ts` que so faz `export * from ...`) ou definicoes de tipos/interfaces sem logica executavel (ex.: `types.ts`, `ttsProvider.ts` quando contem somente a interface)? Eles devem ser explicitamente excluidos do escopo de testes.
- Como fica o teste ja existente para `fetchStories` (atualmente escrito com o executor de testes nativo do Node)? Deve ser migrado para o Vitest e para o novo caminho em `tests/`, preservando a cobertura atual.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O projeto DEVE ter o Vitest instalado e configurado como ferramenta de execucao de testes unitarios.
- **FR-002**: O comando de teste do projeto (script `test` do gerenciador de pacotes) DEVE executar a suite via Vitest.
- **FR-003**: Todos os arquivos de teste unitario DEVEM residir no diretorio `tests/`, na raiz do projeto, e nao mais dentro de `src/`.
- **FR-004**: A estrutura de diretorios dentro de `tests/` DEVE espelhar a estrutura de diretorios dentro de `src/` (mesmos nomes de subpastas e mesmo caminho relativo para cada arquivo testado).
- **FR-005**: Arquivos puramente de tipagem (ex.: `types.ts`, interfaces sem implementacao executavel) DEVEM ser excluidos do escopo de criacao de testes.
- **FR-006**: Arquivos de reexportacao/barril (`index.ts` cujo unico conteudo e `export * from ...`) DEVEM ser excluidos do escopo de criacao de testes.
- **FR-007**: Cada arquivo de codigo-fonte elegivel (contendo logica executavel) DEVE possuir um arquivo de teste correspondente em `tests/`, no caminho espelhado equivalente.
- **FR-008**: Os testes unitarios ja existentes para o modulo de busca de historias do Reddit DEVEM ser migrados para o Vitest e movidos para o caminho espelhado em `tests/`, preservando os casos ja cobertos (incluindo o caso de credenciais ausentes).
- **FR-009**: Testes que exercitam modulos com dependencias externas (rede, sistema de arquivos, processos externos como ffmpeg) DEVEM usar simulacoes (mocks/stubs) para que a suite seja determinística e execute sem exigir acesso a servicos externos reais.
- **FR-010**: A suite de testes DEVE poder ser executada de forma isolada (sem gerar arquivos de midia reais, sem chamadas de rede reais e sem exigir credenciais reais de APIs externas).
- **FR-011**: A execucao da suite DEVE reportar claramente, por arquivo de teste, quais casos passaram e quais falharam.
- **FR-012**: DEVE existir um comando dedicado (`test:coverage`) que executa a suite calculando cobertura de codigo (linhas, funcoes, branches e statements) para os arquivos elegiveis de `src/`.
- **FR-013**: O comando de cobertura DEVE falhar (codigo de saida diferente de 0) caso a cobertura de qualquer uma das metricas (linhas, funcoes, branches, statements) para os arquivos elegiveis fique abaixo de 100%.
- **FR-014**: O relatorio de cobertura DEVE identificar, por arquivo, quais linhas/branches nao foram exercitadas, para que lacunas de cobertura sejam facilmente localizadas.

### Key Entities

- **Arquivo de teste unitario**: Representa a verificacao automatizada do comportamento de um unico arquivo de logica em `src/`; possui um caminho espelhado, um conjunto de casos de sucesso e de erro/borda.
- **Arquivo elegivel para teste**: Arquivo dentro de `src/` que contem logica executavel (funcoes, classes, transformacoes de dados), excluindo arquivos de tipagem pura e barris de reexportacao.
- **Estrutura espelhada de diretorios**: Correspondencia 1:1 entre a arvore de pastas de `src/` e a arvore de pastas de `tests/`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O mantenedor consegue executar a suite completa de testes unitarios com um unico comando, e ela conclui em ambiente local sem necessidade de configuracao manual adicional.
- **SC-002**: 100% dos arquivos de `src/` que contem logica executavel (excluindo tipagem pura e barris de reexportacao) possuem um arquivo de teste correspondente no caminho espelhado dentro de `tests/`.
- **SC-003**: A suite de testes roda de ponta a ponta sem depender de rede real, credenciais reais ou geracao de arquivos de midia reais, permitindo execucao repetida com resultado consistente.
- **SC-004**: Um mantenedor que introduza uma regressao em qualquer um dos modulos de logica critica (configuracao, legendas, TTS, video de fundo, fila de revisao, busca no Reddit) recebe uma falha de teste identificando o modulo afetado antes de a mudanca ser integrada.
- **SC-005**: O comando de cobertura reporta 100% de cobertura (linhas, funcoes, branches e statements) para todos os arquivos elegiveis de `src/`, e falha de forma visivel caso qualquer arquivo elegivel novo ou alterado fique abaixo desse patamar.

## Assumptions

- O gerenciador de pacotes do projeto (Yarn, conforme `package.json`) continuara sendo usado para instalar o Vitest como dependencia de desenvolvimento.
- "Arquivos de tipagens e afins" inclui `src/types.ts` e qualquer arquivo `index.ts` cujo unico papel seja reexportar outros modulos (barril), pois nao contem logica propria a validar.
- Arquivos que definem apenas uma interface/tipo (por exemplo, a definicao de contrato de um provedor, se nao contiver nenhuma funcao com logica executavel) sao tratados como "tipagem" para fins de exclusao; caso o arquivo tambem contenha funcoes auxiliares com logica, essas funcoes devem ser testadas.
- Os testes descritos aqui sao testes unitarios: dependencias externas (rede, sistema de arquivos, processos como ffmpeg, APIs do Reddit/ElevenLabs) sao simuladas via mocks, e nao chamadas de fato.
- A meta de cobertura de 100% (FR-013) aplica-se ao conjunto de arquivos elegiveis definido nesta spec (excluindo `types.ts` e barris `index.ts`); arquivos excluidos do escopo de teste tambem sao excluidos do calculo de cobertura.
- Onde 100% de cobertura de branch for impraticavel para um trecho especifico (ex.: guarda defensiva para um estado que a tipagem ja impede em tempo de compilacao), a excecao pontual DEVE ser marcada explicitamente no codigo (comentario de exclusao de cobertura reconhecido pela ferramenta) em vez de reduzir a meta global — cabe a fase de implementacao decidir, caso a caso, se e preferivel escrever o teste do caso de borda ou marcar a excecao.
- Scripts de CLI em `src/scripts/` sao tratados como pontos de entrada finos que orquestram os modulos ja cobertos; a decisao de nivel de detalhe do teste para cada script cabe a fase de planejamento tecnico, mas cada um deve ao menos ter um arquivo de teste correspondente.
