# Feature Specification: Melhorias Recomendadas (Segurança, Débito Técnico e Performance)

**Feature Branch**: `012-melhorias-recomendadas`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "com base no @ANALISE-PROJETO.md vamos realizar as melhorias recomendadas"

## Clarifications

### Session 2026-07-22

- Q: O package.json já declara `packageManager: yarn@1.22.22`, mas o README manda usar npm, e ambos os lockfiles estão commitados. Qual gerenciador de pacotes deve ser o oficial (FR-008)? → A: Yarn
- Q: FR-013 exige validar a "estrutura mínima obrigatória" de uma história JSON manual. Quais campos devem ser obrigatórios? → A: id, title, body
- Q: FR-012 diz que o CI deve "impedir que a mudança seja mesclada" sem passar. Isso inclui configurar branch protection rules no GitHub, ou só criar o workflow que roda e reporta pass/fail? → A: Só o workflow de CI

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operar o pipeline sem risco de path traversal ou injeção no ffmpeg (Priority: P1)

Como operador do pipeline, ao processar histórias vindas da API do Reddit ou de arquivos JSON manuais, e ao publicar/descartar/regenerar jobs via CLI passando um `jobId`, quero que o sistema rejeite identificadores maliciosos ou malformados antes de tocar no filesystem ou montar comandos do ffmpeg, para que um `id` ou argumento de linha de comando hostil não consiga escrever, mover ou apagar arquivos fora das pastas de armazenamento do projeto, nem injetar opções no filtergraph de vídeo.

**Why this priority**: É a única vulnerabilidade real identificada na análise (severidade média) e afeta dois pontos de entrada (criação de job e comandos `publish`/`discard`/`regenerate:elevenlabs`). Sem essa correção, qualquer melhoria adicional continua exposta ao mesmo risco.

**Independent Test**: Pode ser testado isoladamente executando o pipeline com uma história cujo `id` contenha sequências como `../` ou caracteres de filtergraph (`:`, `'`, `,`, `[`), e chamando `publish`/`discard` com um `jobId` malicioso via argv — em todos os casos o sistema deve recusar a operação com um erro claro, sem tocar em nenhum arquivo fora das pastas esperadas.

**Acceptance Scenarios**:

1. **Given** uma história obtida do Reddit ou de um JSON manual cujo `id` contém `../` ou caracteres especiais, **When** o pipeline monta o `jobId` e os caminhos de armazenamento, **Then** o sistema recusa processar a história com uma mensagem de erro específica, sem criar ou mover nenhum arquivo fora de `storage/`.
2. **Given** um usuário executa `publish`, `discard` ou `regenerate:elevenlabs` passando um `jobId` que não corresponde ao padrão permitido (ex.: contém `/`, `..` ou espaços), **When** o comando é executado, **Then** o sistema recusa a operação antes de qualquer `rename`/`read` no filesystem e informa que o `jobId` é inválido.
3. **Given** um `jobId` válido, **When** o vídeo é composto com legendas via ffmpeg, **Then** o caminho do arquivo `.ass` usado no filtergraph não pode alterar o comando executado (nenhuma opção adicional é interpretada), preservando o comportamento atual para jobs legítimos.

---

### User Story 2 - Não estourar a cota paga do ElevenLabs por configuração inválida (Priority: P1)

Como responsável pelos custos do projeto, quero que o sistema recuse iniciar caso a variável de ambiente que define o limite mensal de caracteres do ElevenLabs esteja ausente, vazia ou não seja um número válido, para que a proteção de cota nunca seja desligada silenciosamente e eu nunca seja cobrado além do esperado por um erro de configuração.

**Why this priority**: Risco financeiro direto e imediato; a falha atual (`NaN` desliga a checagem de orçamento) é silenciosa — ninguém percebe até a fatura chegar.

**Independent Test**: Pode ser testado isoladamente configurando a variável de limite mensal com um valor inválido (vazio, texto não numérico, zero ou negativo) e verificando que qualquer tentativa de uso do provider ElevenLabs falha imediatamente com um erro explícito, em vez de permitir a chamada paga.

**Acceptance Scenarios**:

1. **Given** a variável de limite mensal de caracteres do ElevenLabs está ausente ou contém um valor não numérico, **When** o componente de controle de cota é inicializado, **Then** o sistema lança um erro imediato e explícito, impedindo qualquer chamada à API paga.
2. **Given** a variável de limite mensal está definida como zero ou como um número negativo, **When** o componente de controle de cota é inicializado, **Then** o sistema também recusa a inicialização com erro claro (limite deve ser um número finito maior que zero).
3. **Given** a variável de limite mensal está corretamente definida como um número positivo, **When** o sistema roda normalmente, **Then** o comportamento de checagem de orçamento antes de cada chamada paga permanece exatamente como hoje.

---

### User Story 3 - Gerar vídeo em um único passo de codificação (Priority: P2)

Como operador que gera vídeos em lote, quero que o fluxo de composição local (background + legendas) recodifique o vídeo apenas uma vez em vez de duas, para que o tempo de geração por vídeo caia e a qualidade não seja degradada por recodificações sucessivas.

**Why this priority**: Maior custo de tempo/qualidade identificado na análise de performance, mas não bloqueia segurança nem operação — pode vir depois das correções P1.

**Independent Test**: Pode ser testado gerando um vídeo completo a partir de um job de exemplo e comparando o tempo total de processamento e a contagem de passagens de codificação (via logs/comandos ffmpeg emitidos) antes e depois da mudança — o resultado final (vídeo composto com legendas e áudio sincronizado) deve permanecer visualmente e funcionalmente equivalente.

**Acceptance Scenarios**:

1. **Given** um job com background local (clipes de vídeo) e legendas já geradas, **When** o vídeo final é composto, **Then** apenas uma etapa de recodificação de vídeo é executada (concatenação, corte/escala e legendas aplicadas no mesmo comando/pipeline), em vez de duas etapas separadas.
2. **Given** o vídeo final gerado pelo novo fluxo de um passo, **When** comparado ao vídeo gerado pelo fluxo anterior de dois passos para o mesmo job de entrada, **Then** a duração, proporção (1080x1920), áudio e legendas exibidas são equivalentes.

---

### User Story 4 - Higiene de dependências e configuração do projeto (Priority: P2)

Como novo colaborador ou como eu mesmo reconfigurando o ambiente, quero que o projeto declare de forma inequívoca um único gerenciador de pacotes, não carregue dependências não usadas, e rejeite versões de Node.js incompatíveis, para que a instalação seja previsível e não existam divergências silenciosas entre máquinas.

**Why this priority**: Reduz risco de "funciona na minha máquina" e remove peso morto, mas é uma melhoria de manutenção, não de risco imediato — prioridade média.

**Independent Test**: Pode ser testado clonando o projeto em um ambiente limpo, seguindo apenas as instruções do README, e confirmando que a instalação usa um único lockfile consistente com o gerenciador declarado, que nenhuma dependência não referenciada no código-fonte permanece listada, e que rodar o projeto em uma versão de Node abaixo da mínima suportada produz um aviso claro em vez de uma falha obscura.

**Acceptance Scenarios**:

1. **Given** o repositório em um checkout limpo, **When** um colaborador segue as instruções do README para instalar dependências, **Then** existe apenas um lockfile no repositório e ele corresponde ao gerenciador de pacotes declarado em `package.json` e no README.
2. **Given** a lista de dependências de produção, **When** o código-fonte é inspecionado, **Then** toda dependência declarada é efetivamente importada em algum lugar do código.
3. **Given** o `package.json` do projeto, **When** inspecionado, **Then** ele declara a versão mínima de Node.js suportada, permitindo que ferramentas de instalação avisem sobre incompatibilidade antes de uma falha em tempo de execução.

---

### User Story 5 - Confiança automática na suíte de testes a cada mudança (Priority: P2)

Como mantenedor do projeto, quero que a suíte de testes com 100% de cobertura obrigatória rode automaticamente a cada push e pull request, para que uma regressão nunca chegue à branch principal só porque alguém esqueceu de rodar os testes localmente.

**Why this priority**: A suíte já existe e é de alta qualidade — o único problema é que nada garante sua execução. Vem depois das correções de segurança/custo, mas é rápido de entregar e traz alto retorno.

**Independent Test**: Pode ser testado abrindo um pull request com uma mudança que quebre um teste existente ou reduza a cobertura abaixo do limite configurado, e observando que a verificação automatizada falha e sinaliza isso visivelmente antes que a mudança possa ser mesclada.

**Acceptance Scenarios**:

1. **Given** um push ou pull request no repositório, **When** a mudança é enviada, **Then** a suíte de testes completa (com verificação de cobertura) roda automaticamente sem intervenção manual.
2. **Given** uma mudança que quebra um teste ou reduz a cobertura abaixo do limite de 100%, **When** a verificação automática roda, **Then** o resultado é reportado como falho de forma visível, impedindo a mesclagem silenciosa da mudança.

---

### User Story 6 - Falhas de dados e autenticação nunca se disfarçam de sucesso (Priority: P3)

Como operador, quero que histórias com campos ausentes/malformados e falhas de autenticação na API do Reddit sejam sinalizadas como erro explícito, para que eu nunca interprete "0 histórias encontradas" ou uma falha do TTS sem contexto como se o pipeline tivesse simplesmente não encontrado conteúdo.

**Why this priority**: Melhora diagnóstico e evita perda de tempo investigando sintomas em vez da causa raiz, mas não é bloqueante nem urgente como as prioridades anteriores.

**Independent Test**: Pode ser testado fornecendo um JSON de história manual com um campo obrigatório ausente e, separadamente, simulando uma falha de autenticação OAuth do Reddit — em ambos os casos o sistema deve encerrar com um erro claro identificando a causa, em vez de prosseguir silenciosamente ou falhar em uma etapa distante e não relacionada.

**Acceptance Scenarios**:

1. **Given** um arquivo JSON de história manual sem um campo obrigatório (ex.: corpo do texto), **When** o pipeline tenta carregar essa história, **Then** o sistema rejeita o arquivo imediatamente com uma mensagem indicando qual campo está ausente ou inválido, antes de chegar à etapa de geração de áudio.
2. **Given** uma falha de autenticação (OAuth) ao buscar histórias do Reddit, **When** o pipeline tenta buscar histórias, **Then** o sistema encerra a execução com um erro explícito de autenticação, em vez de retornar uma lista vazia e reportar sucesso com "0 histórias encontradas".

---

### Edge Cases

- O que acontece quando um `jobId` legítimo (gerado internamente a partir de um `id` de história válido) contém caracteres no limite da whitelist (ex.: hífen ou underscore no início/fim)? A validação deve continuar aceitando esses casos legítimos sem falsos positivos.
- Como o sistema se comporta quando a variável de limite de cota do ElevenLabs é alterada para um valor inválido *depois* que o job já começou a rodar com Piper (provider padrão), sem nunca acionar o ElevenLabs? Não deve haver impacto, já que a validação ocorre na inicialização do controle de cota, que só é usado quando o provider ElevenLabs é efetivamente selecionado.
- O que acontece se o novo fluxo de composição em um único passo receber um background com duração menor que o áudio da narração? O comportamento de looping/corte deve permanecer equivalente ao fluxo atual de dois passos.
- Como o CI deve se comportar em um pull request que também precisa de segredos (chaves de API) para rodar? A suíte de testes já usa mocks para chamadas externas (Reddit, ElevenLabs, Pexels) e não deve depender de segredos reais para rodar em CI.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE validar todo `jobId` e todo `story.id` usado para compor caminhos no filesystem contra uma whitelist de caracteres seguros (letras, números, hífen, underscore), rejeitando qualquer valor fora desse padrão antes de qualquer operação de leitura, escrita ou renomeação de arquivo/diretório.
- **FR-002**: O sistema DEVE aplicar essa validação de `jobId` tanto no ponto de criação do job (a partir de `story.id`) quanto em todos os comandos de CLI que recebem um `jobId` como argumento (publicar, descartar, regenerar com ElevenLabs).
- **FR-003**: O sistema DEVE garantir que o caminho do arquivo de legendas usado no comando de composição de vídeo não possa ser interpretado como opções adicionais do filtergraph do ffmpeg, independentemente do conteúdo do `jobId` de origem.
- **FR-004**: O sistema DEVE validar, na inicialização do controle de cota do ElevenLabs, que o limite mensal de caracteres é um número finito maior que zero, lançando um erro imediato e descritivo caso contrário (valor ausente, não numérico, zero ou negativo).
- **FR-005**: O sistema NÃO DEVE permitir nenhuma chamada à API paga do ElevenLabs quando o limite de cota não puder ser determinado como um número válido.
- **FR-006**: O sistema DEVE compor o vídeo final (background + escala/corte para 1080x1920 + legendas) usando uma única etapa de recodificação de vídeo, eliminando a recodificação intermediária hoje usada apenas para montar o background local.
- **FR-007**: O resultado do vídeo composto pelo novo fluxo de uma etapa DEVE ser equivalente em conteúdo (duração, proporção, áudio, legendas exibidas) ao resultado produzido pelo fluxo anterior de duas etapas, para o mesmo job de entrada.
- **FR-008**: O projeto DEVE adotar Yarn como gerenciador de pacotes oficial (já declarado em `packageManager`), manter apenas `yarn.lock` no repositório (removendo `package-lock.json`), e atualizar o README para instruir `yarn install`/`yarn <script>` em vez de `npm install`.
- **FR-009**: O projeto NÃO DEVE declarar como dependência de produção nenhum pacote que não seja efetivamente importado em algum lugar do código-fonte.
- **FR-010**: O projeto DEVE declarar explicitamente a versão mínima de Node.js suportada em sua configuração de pacote.
- **FR-011**: O sistema DEVE executar automaticamente a suíte de testes completa (incluindo verificação do limite de cobertura configurado) a cada push e a cada pull request, sem depender de execução manual.
- **FR-012**: O sistema DEVE sinalizar de forma visível, na verificação automática (workflow de CI), quando um teste falha ou quando a cobertura fica abaixo do limite configurado. Configurar o repositório para bloquear a mesclagem enquanto essa verificação não passar (branch protection) é uma ação administrativa fora do escopo desta feature, a ser feita separadamente pelo mantenedor.
- **FR-013**: O sistema DEVE validar, antes de iniciar o processamento, que toda história carregada a partir de arquivos JSON externos (manuais) contém os campos obrigatórios `id`, `title` e `body` com o tipo correto (texto não vazio), rejeitando o arquivo com uma mensagem identificando qual campo está ausente ou inválido caso essa condição não seja satisfeita.
- **FR-014**: O sistema DEVE propagar como erro explícito qualquer falha de autenticação ao buscar histórias na API do Reddit, em vez de retornar uma lista vazia como se nenhuma história tivesse sido encontrada.

### Key Entities

- **Job (fila de revisão)**: unidade de trabalho identificada por um `jobId` derivado do `id` da história de origem; possui um estado (pendente, aprovado, publicado, descartado) representado por sua localização em pastas do filesystem.
- **História (Story)**: conteúdo de origem (Reddit ou arquivo manual) com campos obrigatórios `id`, `title` e `body` (texto), usados para gerar narração e legendas.
- **Controle de Cota (ElevenLabs)**: registro do consumo mensal de caracteres comparado a um limite configurado, usado para decidir se uma chamada paga é permitida.
- **Pipeline de Composição de Vídeo**: sequência de etapas que transforma background + áudio + legendas em um vídeo vertical final, hoje em duas etapas de recodificação e, após a melhoria, em uma etapa única.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das tentativas de operar (criar job, publicar, descartar, regenerar) com um `jobId`/`story.id` fora da whitelist de caracteres seguros são recusadas antes de qualquer alteração no filesystem, verificável por testes automatizados dedicados.
- **SC-002**: Zero chamadas pagas ao ElevenLabs ocorrem quando o limite de cota configurado é inválido — verificável por teste automatizado que configura um limite inválido e confirma que a chamada é bloqueada antes de sair do processo.
- **SC-003**: O tempo total de geração de vídeo no fluxo local (do início da composição até o arquivo final) reduz em pelo menos 30% para um job de referência, comparado ao fluxo de duas etapas anterior.
- **SC-004**: A instalação do projeto a partir de um checkout limpo, seguindo apenas o README, funciona sem avisos de conflito de lockfile ou dependências ausentes.
- **SC-005**: 100% dos pushes e pull requests no repositório disparam a execução da suíte de testes automaticamente, com o resultado (passou/falhou) visível antes de qualquer mesclagem.
- **SC-006**: Uma história manual com campo obrigatório ausente é rejeitada com mensagem de erro específica em menos de 1 segundo de processamento, sem chegar à etapa de geração de áudio.
- **SC-007**: Uma falha de autenticação simulada na busca de histórias do Reddit resulta em encerramento com erro explícito em 100% dos casos testados, nunca em uma lista vazia reportada como sucesso.

## Assumptions

- A suíte de testes existente (94 testes, cobertura 100%) e seus helpers (`tests/helpers/mockFetch.ts`, `tempDir.ts`, `cli.ts`) continuam sendo a base de verificação para todas as mudanças desta feature — nenhuma melhoria aqui deve reduzir a cobertura abaixo do limite atual.
- A infraestrutura de CI usada será GitHub Actions, por já ser o padrão do repositório hospedado no GitHub e não exigir configuração de infraestrutura adicional.
- Configurar branch protection rules no GitHub para tornar o check de CI obrigatório antes de merge é uma ação administrativa que fica a cargo do mantenedor fora desta feature; a feature entrega apenas o workflow de CI que roda e reporta o resultado (ver FR-012).
- As melhorias de "baixo impacto" listadas na análise original (extensão de arquivo `narration.mp3`→`.wav`, `engines` no `package.json`, checagem de `res.ok` na Pexels, `--` antes da URL no yt-dlp, guard contra clipes de duração zero, streaming no download de background) fazem parte do escopo desta feature como parte das User Stories 4 e 6 ou como itens técnicos menores tratados durante a implementação das prioridades acima, e não precisam de user stories dedicadas por não alterarem comportamento visível ao usuário do CLI.
- Refatorações puramente internas mencionadas na análise (extrair `src/scripts/lib/cli.ts` compartilhado, substituir `fluent-ffmpeg` por invocação direta) são tratadas como parte da implementação das User Stories 3 e 4 quando tecnicamente necessárias, mas não constituem requisitos de comportamento observável e por isso não geram FRs próprios — ficam para a fase de planejamento técnico (`/speckit-plan`).
