# Feature Specification: Setup do Projeto

**Feature Branch**: `001-setup-projeto`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Setup do Projeto: deixar o esqueleto do projeto Node/TS pronto para receber os módulos das fases seguintes, com dependências instaláveis e variáveis de ambiente documentadas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preparar ambiente de desenvolvimento do zero (Priority: P1)

Como responsável por evoluir o pipeline de geração de vídeos, quero clonar o
repositório e ter tudo pronto para começar a implementar os módulos das
fases seguintes, sem precisar decidir estrutura de pastas, dependências ou
variáveis de ambiente na hora.

**Why this priority**: Sem essa base, nenhuma das fases seguintes (Reddit,
TTS, legendas, vídeo, orquestração) tem onde ser implementada. É o
pré-requisito de tudo.

**Independent Test**: Pode ser testado sozinho: clonar o repositório recém
criado, instalar dependências e confirmar que a estrutura de pastas e
arquivos de configuração existem e funcionam, mesmo sem nenhuma lógica de
negócio implementada ainda.

**Acceptance Scenarios**:

1. **Given** um clone limpo do repositório, **When** as dependências do
   projeto são instaladas, **Then** a instalação conclui sem erros.
2. **Given** o projeto instalado, **When** a checagem de tipos é executada,
   **Then** ela conclui sem erros mesmo sem código de negócio.
3. **Given** o repositório clonado, **When** a estrutura de pastas é
   inspecionada, **Then** existem pastas dedicadas para cada módulo futuro
   (busca de histórias, narração, legendas, vídeo, revisão) e para os
   diferentes estados de armazenamento dos vídeos gerados.

---

### User Story 2 - Descobrir quais variáveis de ambiente e dependências externas são necessárias (Priority: P2)

Como responsável por configurar o ambiente antes de rodar o pipeline, quero
um arquivo de exemplo com todas as variáveis de ambiente esperadas e um
roteiro de instalação das ferramentas externas (fora do gerenciador de
pacotes do projeto), para não descobrir isso aos poucos, fase por fase.

**Why this priority**: Reduz retrabalho e frustração: sem isso, cada fase
subsequente exigiria voltar e adicionar variáveis/instruções que poderiam
ter sido previstas desde o início.

**Independent Test**: Pode ser testado comparando o arquivo de exemplo de
variáveis de ambiente com a lista de variáveis que as fases 02–07 vão
precisar, e confirmando que as ferramentas externas documentadas (conversão
de vídeo, síntese de voz local, transcrição) respondem corretamente quando
verificadas no ambiente.

**Acceptance Scenarios**:

1. **Given** o arquivo de exemplo de variáveis de ambiente, **When** ele é
   comparado às necessidades de todas as fases seguintes, **Then** nenhuma
   variável usada por essas fases está faltando.
2. **Given** as instruções de instalação de dependências externas, **When**
   um responsável as segue em um ambiente novo, **Then** as ferramentas de
   conversão de vídeo, síntese de voz e transcrição ficam disponíveis e
   respondem a uma verificação básica de funcionamento.

### Edge Cases

- O que acontece se uma variável de ambiente exigida por uma fase futura for
  esquecida no arquivo de exemplo? (Deve ser tratado como lacuna a revisar
  após a especificação das fases 02–07, antes de considerar o setup
  concluído.)
- Como o setup se comporta em um ambiente onde as dependências externas
  (fora do gerenciador de pacotes do projeto) ainda não estão instaladas?
  (As instruções documentadas devem deixar claro que são pré-requisitos
  manuais, não instalados automaticamente.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O projeto MUST fornecer um manifesto de dependências e scripts
  de execução nomeados para as operações principais do fluxo humano: gerar
  vídeos em lote, publicar um vídeo aprovado, descartar um vídeo, e
  regenerar a narração com o provedor de TTS alternativo.
- **FR-002**: O projeto MUST fornecer configuração de checagem de tipos
  estrita, de forma que erros de tipo sejam detectados antes da execução.
- **FR-003**: O projeto MUST fornecer um arquivo de exemplo de variáveis de
  ambiente cobrindo todas as integrações externas usadas pelo pipeline
  (busca de histórias, síntese de voz local e em nuvem, geração de
  legendas, busca de vídeo de fundo).
- **FR-004**: O projeto MUST fornecer uma estrutura de pastas que separe
  claramente cada módulo de domínio (busca de histórias, síntese de voz,
  legendas, vídeo, revisão), os scripts executáveis, e os diretórios de
  armazenamento correspondentes a cada estado de um vídeo no fluxo de
  revisão (pendente, aprovado, publicado, descartado).
- **FR-005**: O projeto MUST documentar os passos de instalação manual das
  ferramentas externas que não são gerenciadas pelo manifesto de
  dependências do projeto.
- **FR-006**: O setup MUST permitir verificar, sem escrever código de
  negócio, que o ambiente de desenvolvimento está pronto (instalação de
  dependências bem-sucedida e checagem de tipos sem erros).

### Key Entities

- **Estrutura do projeto**: representa a organização de pastas e arquivos
  de configuração que todo o restante do pipeline vai assumir como base
  fixa.
- **Variáveis de ambiente**: representam as credenciais e parâmetros de
  configuração que cada integração externa (busca de histórias, TTS,
  legendas, vídeo de fundo) precisa para funcionar.
- **Dependências externas**: ferramentas que rodam fora do gerenciador de
  pacotes do projeto (conversão de vídeo, síntese de voz local, transcrição
  de áudio) e que precisam estar disponíveis no ambiente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um responsável consegue preparar um ambiente de
  desenvolvimento funcional do zero (clone → dependências instaladas →
  checagem de tipos limpa) em menos de 15 minutos, assumindo que as
  ferramentas externas já estão presentes no sistema.
- **SC-002**: 100% das variáveis de ambiente exigidas pelas fases 02 a 07
  do pipeline estão presentes no arquivo de exemplo antes dessas fases
  serem consideradas prontas para implementação.
- **SC-003**: Todas as ferramentas externas documentadas respondem com
  sucesso a uma verificação básica de funcionamento (comando de versão ou
  equivalente) após seguir as instruções de instalação.
- **SC-004**: Nenhuma fase subsequente (02–10) precisa criar pastas de
  primeiro nível novas na estrutura do projeto — apenas adicionar arquivos
  dentro da estrutura já prevista.

## Assumptions

- O ambiente de desenvolvimento é uma máquina com acesso a um gerenciador
  de pacotes Node.js e a um interpretador Python, usados para instalar as
  dependências do projeto e as ferramentas externas de transcrição.
- Esta fase não implementa nenhuma lógica de negócio (busca de histórias,
  síntese de voz, montagem de vídeo etc.) — apenas prepara o terreno para
  que as fases seguintes o façam.
- CI/CD, containerização e automação de deploy estão fora de escopo desta
  fase e não são assumidos como pré-requisito.
- A lista de variáveis de ambiente pode precisar de uma revisão final após
  as fases 02–07 estarem especificadas, para capturar qualquer variável que
  não tenha sido prevista de antemão.
