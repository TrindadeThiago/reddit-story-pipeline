<!--
Sync Impact Report
- Version change: (template, unratified) → 1.0.0
- Rationale: Initial ratification. All placeholder tokens replaced with concrete
  principles derived from the project's existing implementation, specs/ history,
  and docs/ (architecture.md, roadmap.md, testing.md). MINOR/MAJOR semantics do
  not apply to the first version — treated as the baseline (1.0.0).
- Modified principles: n/a (first ratified version)
- Added sections:
  - Core Principles: I. Revisão Humana Obrigatória, II. Contratos Plugáveis
    Antes de Implementação Concreta, III. Simplicidade Deliberada (YAGNI),
    IV. Isolamento e Contexto de Falhas, V. Spec-Driven, Documentação Viva
  - Restrições Técnicas e Operacionais (Section 2)
  - Fluxo de Desenvolvimento e Qualidade (Section 3)
  - Governance
- Removed sections: none (template placeholders only)
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — "Constitution Check" gate is generic
    ("[Gates determined based on constitution file]"), no edit needed; gates below
    are what a /speckit-plan run should check against.
  - ✅ .specify/templates/spec-template.md — no agent-specific or constitution-
    contradicting content found; no edit needed.
  - ✅ .specify/templates/tasks-template.md — task categorization (Setup/
    Foundational/User Story phases) does not conflict with any principle below;
    no edit needed.
  - ✅ README.md, docs/architecture.md, docs/roadmap.md, docs/testing.md —
    already describe the same principles in practice (pluggable TtsProvider,
    filesystem-based queue, per-stage error isolation, manual review gate,
    spec-driven workflow); no contradictions found, no edit needed.
- Follow-up TODOs:
  - TODO(RATIFICATION_DATE): the project has no recorded formal ratification
    event prior to this command; using the date this constitution was first
    written as the ratification date. If an earlier informal agreement date is
    known, replace it.
-->

# reddit-story-pipeline Constitution

## Core Principles

### I. Revisão Humana Obrigatória

Nenhum vídeo é publicado sem revisão humana explícita do resultado final
(`final.mp4`). O pipeline automatizado (Reddit/`--input` → TTS → legendas →
composição) DEVE sempre terminar em `storage/pending-review/`, nunca
diretamente em `storage/published/`. A decisão entre publicar, regenerar
com outro provider de TTS ou descartar é SEMPRE acionada manualmente por um
comando CLI (`publish`, `regenerate:elevenlabs`, `discard`) apontando para
um `jobId` específico — não existe (e não deve ser adicionado) um caminho
automático que pule essa revisão.

**Rationale**: TTS e seleção de vídeo de fundo são heurísticos e podem
falhar de formas não capturáveis por teste automatizado (qualidade de voz,
sincronismo de legenda, adequação do vídeo de fundo ao conteúdo). A revisão
manual é o único gate de qualidade real do sistema hoje.

### II. Contratos Plugáveis Antes de Implementação Concreta

Onde múltiplas implementações são esperadas ou já existem (hoje: TTS via
`TtsProvider`), a implementação DEVE depender da interface, nunca de uma
implementação concreta específica. Módulos consumidores (legendas,
composição de vídeo, fila de revisão) NÃO DEVEM ramificar comportamento
com base em qual implementação concreta foi usada (`if provider === "piper"`
é uma violação). Trocar de implementação (ex: Piper → ElevenLabs) DEVE ser
possível só injetando outra dependência, sem alterar módulos consumidores.

**Rationale**: É esse desacoplamento que permite o "caminho 2" da revisão
(`regenerate:elevenlabs`) reusar `runPipelineForStory` inteiro sem duplicar
lógica — só troca o `TtsProvider` injetado.

### III. Simplicidade Deliberada (YAGNI)

Não introduzir infraestrutura (banco de dados, fila gerenciada, servidor
HTTP, autenticação multiusuário) para resolver um problema que a estrutura
atual (pastas no filesystem, execução via CLI local) ainda resolve
adequadamente. Complexidade nova DEVE ser justificada por um requisito real
já observado — não por uma necessidade hipotética futura. Quando um
`TODO`/limitação deliberada existir no código, ele DEVE estar documentado em
`docs/roadmap.md` com o motivo de ter ficado fora do escopo atual.

**Rationale**: O volume de uso real (uma pessoa, poucas dezenas de vídeos
por execução, revisão manual) não justifica hoje a complexidade operacional
de um banco de dados ou de um serviço sempre-ativo. Ver
`docs/architecture.md` §"Por que não há servidor/API/UI" e
`docs/roadmap.md` §"Quando reconsiderar a fila baseada em filesystem" para
os gatilhos explícitos que tornariam essa escolha obsoleta.

### IV. Isolamento e Contexto de Falhas

A falha de uma unidade de trabalho NÃO DEVE interromper unidades de trabalho
irmãs no mesmo nível: uma falha ao buscar um subreddit não aborta a busca
nos demais; a falha ao processar uma história não impede o processamento
das demais histórias da mesma execução. Dentro de um job, cada etapa DEVE
capturar e recontextualizar erros com o nome da etapa e o identificador do
job antes de relançar (padrão `runStage`), de forma que a causa raiz seja
identificável a partir do log sem instrumentação adicional.

**Rationale**: O pipeline roda em lote, sem supervisão humana durante a
execução — sem esse isolamento, uma história problemática (ex: subreddit
fora do ar, texto que quebra o TTS) derrubaria o processamento de todas as
outras histórias da mesma execução, e um erro genérico sem contexto
obrigaria a reproduzir o problema manualmente para diagnosticar.

### V. Spec-Driven, Documentação Viva

Funcionalidade nova de escopo considerável (novo módulo, nova integração
externa, mudança de contrato entre módulos) DEVE ter uma spec correspondente
em `specs/` antes ou junto da implementação, seguindo o formato já
estabelecido (Contrato de interface + Critérios de aceite). `docs/` DEVE
refletir o estado atual do código, não o estado planejado — ao alterar
comportamento documentado (módulo, variável de ambiente, comando CLI,
formato de dado em `types.ts`), a página correspondente em `docs/` DEVE ser
atualizada na mesma unidade de trabalho. Quando `docs/` e `specs/`
divergirem, `docs/` é a fonte da verdade sobre o presente; `specs/` é o
histórico de decisão de cada fase.

**Rationale**: O projeto foi construído fase a fase via spec-kit
especificamente para que cada decisão tivesse contexto registrado antes da
implementação; deixar `docs/` divergir do código anula o valor de ter
documentação centralizada e força quem lê a inferir o comportamento atual
lendo código-fonte.

## Restrições Técnicas e Operacionais

- **Stack**: TypeScript em modo ESM, executado via `tsx` sobre Node.js. Não
  introduzir um segundo runtime/linguagem no `src/` sem justificativa
  registrada em spec — a única exceção já aceita é `scripts/transcribe.py`
  (Python, chamado via subprocess), porque é a ponte necessária com
  WhisperX.
- **Segredos**: nenhuma credencial real (chave de API, client secret) é
  commitada. `.env` é local e ignorado pelo git; `.env.example` documenta as
  chaves esperadas sem valores reais. Variáveis obrigatórias DEVEM ser
  validadas no início do script (`requireEnv`) com mensagem de erro clara,
  nunca falhar silenciosamente ou seguir com valor vazio.
- **Dependências externas pesadas** (ffmpeg, Piper, WhisperX) são
  instaladas fora do `npm`, documentadas em `docs/environment.md`; código
  que as invoca DEVE assumir que podem estar ausentes/mal configuradas e
  falhar com mensagem que identifique a dependência, não um stack trace
  genérico.
- **Fila de revisão**: os quatro estados (`pending-review`, `approved`,
  `published`, `discarded`) e a estrutura de arquivos dentro de cada
  `<jobId>/` (`job.json`, `narration.*`, `captions.srt`, `captions.ass`,
  `background.mp4`, `final.mp4`) são um contrato implícito consumido pelos
  scripts CLI — mudanças nessa estrutura são mudança de contrato e exigem
  atualização coordenada de `reviewQueue.ts`, dos scripts em `src/scripts/`,
  e de `docs/data-model.md`.

## Fluxo de Desenvolvimento e Qualidade

- **Commits atômicos**: cada commit representa uma unidade de trabalho
  coerente e completa (uma feature, uma correção, uma atualização de
  documentação) — não misturar mudanças não relacionadas num único commit,
  nem fatiar uma mudança coerente em commits que não compilam/fazem sentido
  isoladamente.
- **Verificação antes de declarar concluído**: `npx tsc --noEmit` DEVE
  passar antes de qualquer commit. Para mudanças que afetam o pipeline de
  vídeo/áudio observável (composição, legendas, TTS), a verificação DEVE
  incluir rodar o fluxo real (`npm run generate -- --input ...`) e inspecionar
  a saída (áudio, `.ass`, frame extraído do vídeo) — passar apenas no
  type-check não é evidência suficiente de que o comportamento está correto.
  "Funciona" é uma afirmação que exige evidência de execução, não inferência
  a partir da leitura do código.
- **Testes automatizados**: cobertura obrigatória para lógica de decisão
  pura e testável sem dependências externas pesadas (parsing, filtros,
  formatação, contratos de autenticação) — o padrão já estabelecido em
  `fetchStories.test.ts` (mock de `fetch`, sem framework externo, via
  `node:test`) é o modelo a seguir. Módulos que dependem inescapavelmente de
  binários/serviços externos (ffmpeg, Piper, WhisperX, APIs pagas) são
  validados manualmente e o resultado dessa validação — o que foi confirmado
  e o que ainda depende de ambiente real — é registrado em
  `docs/testing.md`, não perdido em conversas.
- **TODOs deliberados**: um `TODO` no código só é aceitável quando
  correspondente a uma entrada em `docs/roadmap.md` explicando por que foi
  deixado de fora do escopo atual. `TODO`s órfãos (sem entrada correspondente)
  devem ser resolvidos ou documentados na próxima mudança que tocar o
  arquivo.

## Governance

Esta constituição prevalece sobre qualquer prática, convenção de spec ou
preferência de estilo em conflito registrada em `specs/` ou `docs/`.

**Emendas**: qualquer mudança nesta constituição (adição, remoção ou
redefinição de princípio, ou mudança de seção de governança) DEVE ser feita
através do comando `/speckit-constitution`, que recalcula a versão via
versionamento semântico (MAJOR: remoção/redefinição incompatível de
princípio; MINOR: novo princípio ou seção; PATCH: clarificação sem mudança
de regra), gera um Sync Impact Report, e verifica se `.specify/templates/`
e `docs/` precisam de atualização correspondente antes de finalizar.

**Conformidade**: mudanças de escopo considerável (ver Princípio V) DEVEM
ser cotejadas contra os princípios acima antes de serem dadas como
concluídas — em particular, qualquer novo `TODO` sem entrada em
`docs/roadmap.md`, qualquer caminho que publique sem passar por
`storage/pending-review/`, ou qualquer módulo consumidor que ramifique por
implementação concreta de `TtsProvider`, é uma violação a ser corrigida
antes do commit, não depois.

**Version**: 1.0.0 | **Ratified**: 2026-07-20 | **Last Amended**: 2026-07-20
