---

description: "Task list for implementation of 012-melhorias-recomendadas"
---

# Tasks: Melhorias Recomendadas (Segurança, Débito Técnico e Performance)

**Input**: Design documents from `/specs/012-melhorias-recomendadas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluídas. O projeto mantém threshold de cobertura de 100% (`vitest.config.ts`) e cada módulo existente já tem um arquivo de teste espelhado em `tests/` — toda tarefa de implementação abaixo vem acompanhada da tarefa de teste correspondente, seguindo o padrão já estabelecido no repositório.

**Organization**: Tarefas agrupadas por user story (spec.md), na ordem de prioridade P1 → P1 → P2 → P2 → P2 → P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: A qual user story a tarefa pertence (US1..US6)
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

Projeto único: `src/`, `tests/`, `.github/` na raiz do repositório (ver `plan.md` → Project Structure).

---

## Phase 1: Setup

**Purpose**: Confirmar baseline antes de qualquer mudança.

- [X] T001 Confirmar baseline limpo: rodar `npx tsc --noEmit` e `yarn test:coverage` na raiz do repositório e confirmar que ambos passam antes de iniciar qualquer tarefa abaixo (nenhum arquivo alterado nesta tarefa).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Nenhuma infraestrutura compartilhada bloqueante é necessária além do Setup — cada user story desta feature toca módulos distintos (`review`/`pipeline`/`scripts` para US1, `tts` para US2, `video` para US3, `package.json`/README para US4, `.github/workflows` para US5, `reddit`/`scripts` para US6) e pode ser implementada de forma independente após o Setup.

**⚠️ Nenhuma tarefa nesta fase — prossiga direto para as user stories após T001.**

---

## Phase 3: User Story 1 - Operar o pipeline sem risco de path traversal ou injeção no ffmpeg (Priority: P1) 🎯 MVP

**Goal**: Todo `jobId`/`story.id` usado para compor caminhos no filesystem ou no filtergraph do ffmpeg é validado contra uma whitelist segura antes de qualquer I/O, tanto na criação do job quanto nos comandos `publish`/`discard`/`regenerate:elevenlabs`.

**Independent Test**: Rodar o pipeline com uma história cujo `id` contenha `../` ou caracteres de filtergraph, e chamar `discard`/`publish` com um `jobId` malicioso via argv — em ambos os casos a operação deve ser recusada antes de qualquer escrita/leitura em disco (ver `contracts/cli-jobid-validation.md`).

### Implementation for User Story 1

- [X] T002 [US1] Criar utilitário `assertSafeId(id: string, field: string): void` em `src/modules/shared/assertSafeId.ts`, validando contra `^[A-Za-z0-9_-]+$` e lançando `Error` descritivo (valor recebido + padrão esperado) caso contrário.
- [X] T003 [P] [US1] Testes unitários de `assertSafeId` em `tests/modules/shared/assertSafeId.test.ts` (casos: id válido, `../`, `/`, espaço, vazio, caracteres de filtergraph `:`, `'`, `,`, `[`).
- [X] T004 [US1] Aplicar `assertSafeId(story.id, "story.id")` em `src/pipeline.ts` (`runPipelineForStory`) antes de montar `jobId`/`workDir`.
- [X] T005 [P] [US1] Atualizar `tests/pipeline.test.ts` cobrindo rejeição de `story.id` malicioso antes de qualquer `mkdir`/escrita.
- [X] T006 [US1] Aplicar `assertSafeId(jobId, "jobId")` em `src/scripts/publish.ts` antes de qualquer chamada a `reviewQueue`.
- [X] T007 [US1] Aplicar `assertSafeId(jobId, "jobId")` em `src/scripts/discard.ts` antes de qualquer chamada a `reviewQueue`.
- [X] T008 [US1] Aplicar `assertSafeId(jobId, "jobId")` em `src/scripts/regenerate-with-elevenlabs.ts` antes de qualquer chamada a `reviewQueue`.
- [X] T009 [P] [US1] Atualizar `tests/scripts/publish.test.ts` cobrindo rejeição de `jobId` malicioso via argv, sem chamada a `rename`.
- [X] T010 [P] [US1] Atualizar `tests/scripts/discard.test.ts` cobrindo rejeição de `jobId` malicioso via argv, sem chamada a `rename`.
- [X] T011 [P] [US1] Atualizar `tests/scripts/regenerate-with-elevenlabs.test.ts` cobrindo rejeição de `jobId` malicioso via argv.
- [X] T012 [P] [US1] Adicionar teste de regressão em `tests/modules/video/composeVideo.test.ts` documentando que, com um `jobId` já sanitizado, o caminho de `captionsAssPath` não pode conter caracteres de filtergraph (asserção sobre o formato do caminho recebido).

**Checkpoint**: US1 completa e testável de forma independente — `publish`/`discard`/`regenerate:elevenlabs`/criação de job recusam `jobId`/`story.id` inseguros antes de qualquer I/O.

---

## Phase 4: User Story 2 - Não estourar a cota paga do ElevenLabs por configuração inválida (Priority: P1)

**Goal**: A inicialização do `QuotaTracker` recusa qualquer `monthlyLimit` que não seja um número finito maior que zero, impedindo qualquer chamada paga ao ElevenLabs quando a configuração for inválida.

**Independent Test**: Configurar `ELEVENLABS_MONTHLY_CHAR_LIMIT` com um valor inválido (vazio, texto, zero, negativo) e confirmar que a construção do `QuotaTracker` falha imediatamente, antes de qualquer requisição HTTP ao ElevenLabs (ver `contracts/quota-tracker-validation.md`).

### Implementation for User Story 2

- [X] T013 [US2] Adicionar validação no construtor de `QuotaTracker` em `src/modules/tts/quotaTracker.ts`: lançar `Error` se `!Number.isFinite(monthlyLimit) || monthlyLimit <= 0`.
- [X] T014 [P] [US2] Atualizar `tests/modules/tts/quotaTracker.test.ts` com casos: `NaN`, `0`, negativo (devem lançar no construtor) e valor válido (comportamento inalterado).
- [X] T015 [US2] Revisar `src/scripts/regenerate-with-elevenlabs.ts`: manter o `Number(ENV.ELEVENLABS_MONTHLY_CHAR_LIMIT)` já existente, mas remover qualquer guarda duplicada agora redundante com a validação do construtor (T013).
- [X] T016 [P] [US2] Atualizar `tests/scripts/regenerate-with-elevenlabs.test.ts` cobrindo que um limite de cota inválido interrompe a execução antes de qualquer chamada ao provider ElevenLabs.

**Checkpoint**: US1 e US2 completas — nenhuma chamada paga ao ElevenLabs pode ocorrer com cota mal configurada, e `jobId`/`story.id` seguem sanitizados.

---

## Phase 5: User Story 3 - Gerar vídeo em um único passo de codificação (Priority: P2)

**Goal**: A composição do vídeo final no fluxo local (background + legendas) roda em uma única etapa de recodificação em vez de duas, reduzindo o tempo de geração em pelo menos 30% (SC-003) sem alterar o resultado observável.

**Independent Test**: Gerar um vídeo completo a partir de um job de referência e confirmar (via logs/comandos ffmpeg emitidos) que apenas uma recodificação de vídeo ocorre, com resultado equivalente (duração, proporção 1080x1920, áudio, legendas) ao fluxo anterior de duas etapas.

### Implementation for User Story 3

- [X] T017 [US3] Implementar composição em um único comando `fluent-ffmpeg` em `src/modules/video/composeVideo.ts`: aceitar a lista de clipes de fundo (em vez de um `backgroundVideoPath` já montado) e encadear `concat` dos clipes → `scale+crop` 1080x1920 → `subtitles` → mapeamento do áudio da narração, conforme decisão registrada em `research.md` (item 4).
- [X] T018 [US3] Reduzir `src/modules/video/localBackgroundProvider.ts` para expor apenas a seleção de clipes (`pickClips`/`flattenClips`), removendo a montagem/execução do comando ffmpeg de `assembleClips` (agora responsabilidade de `composeVideo.ts`).
- [X] T019 [US3] Atualizar `src/pipeline.ts` para, no caminho `backgroundSource === "local"`, chamar a nova composição em passo único em vez da sequência `buildLocalBackgroundVideo` → `composeVideo`.
- [X] T020 [P] [US3] Atualizar `tests/modules/video/composeVideo.test.ts` para a nova assinatura (lista de clipes + captions + narração), validando que apenas uma chamada `.run()`/comando ffmpeg é emitida.
- [X] T021 [P] [US3] Atualizar `tests/modules/video/localBackgroundProvider.test.ts` para cobrir apenas a responsabilidade de seleção de clipes.
- [X] T022 [US3] Atualizar `tests/pipeline.test.ts` refletindo a chamada única de composição para o fluxo local.
- [X] T023 [P] [US3] Atualizar `docs/architecture.md` (e/ou `docs/data-model.md`, se aplicável) descrevendo o novo fluxo de composição em passo único.

**Checkpoint**: US1, US2 e US3 completas — vídeo local é gerado em uma única recodificação, com resultado equivalente ao anterior.

---

## Phase 6: User Story 4 - Higiene de dependências e configuração do projeto (Priority: P2)

**Goal**: O projeto declara Yarn como único gerenciador de pacotes oficial, remove a dependência morta `node-fetch`, e declara a versão mínima de Node.js suportada.

**Independent Test**: Clonar o repositório limpo, seguir apenas o README, e confirmar instalação com um único lockfile (`yarn.lock`), sem dependências não usadas, e com `engines.node` declarado.

### Implementation for User Story 4

- [X] T024 [US4] Remover `package-lock.json` do repositório (`git rm package-lock.json`).
- [X] T025 [P] [US4] Remover `node-fetch` de `dependencies` em `package.json` (confirmar antes com `grep -r "node-fetch" src/` que não há import ativo).
- [X] T026 [P] [US4] Adicionar `"engines": { "node": ">=18" }` em `package.json`.
- [X] T027 [US4] Atualizar `README.md`: instruções de instalação e todos os comandos `npm run X`/`npm install` para `yarn install`/`yarn X`.
- [X] T028 [P] [US4] Revisar `docs/` (`docs/environment.md`, demais arquivos) por referências a `npm` e atualizar para `yarn` onde aplicável.
- [X] T029 [US4] Rodar `yarn install` para confirmar que `yarn.lock` reflete a remoção de `node-fetch`, e commitar o lockfile atualizado.

**Checkpoint**: Instalação do projeto é inequívoca (Yarn único), sem dependências mortas.

---

## Phase 7: User Story 5 - Confiança automática na suíte de testes a cada mudança (Priority: P2)

**Goal**: A suíte de testes com cobertura obrigatória roda automaticamente a cada push e pull request via GitHub Actions.

**Independent Test**: Abrir um pull request com uma mudança que quebra um teste ou reduz a cobertura, e confirmar que o workflow de CI reporta falha visível (ver `contracts/ci-workflow.md`).

### Implementation for User Story 5

- [X] T030 [US5] Criar `.github/workflows/ci.yml` conforme `contracts/ci-workflow.md`: gatilhos `push`/`pull_request`, checkout, setup-node (versão de `engines.node`), `corepack enable`, `yarn install --frozen-lockfile`, `yarn test:coverage`.
- [X] T031 [P] [US5] Atualizar `docs/testing.md` documentando que a suíte roda automaticamente em CI a cada push/PR, referenciando o workflow criado.

**Checkpoint**: CI ativo — qualquer push/PR dispara `vitest run --coverage` automaticamente.

---

## Phase 8: User Story 6 - Falhas de dados e autenticação nunca se disfarçam de sucesso (Priority: P3)

**Goal**: Histórias manuais com campos obrigatórios ausentes e falhas de autenticação do Reddit são sinalizadas como erro explícito, nunca como sucesso silencioso.

**Independent Test**: Fornecer um JSON de história manual sem `body`, e simular uma falha de autenticação OAuth do Reddit — ambos devem encerrar com erro explícito identificando a causa.

### Implementation for User Story 6

- [X] T032 [US6] Criar type guard `isValidRedditStory(value: unknown): value is RedditStory` em `src/modules/shared/validateStory.ts`, verificando `id`, `title`, `body` como strings não vazias.
- [X] T033 [P] [US6] Testes unitários de `isValidRedditStory` em `tests/modules/shared/validateStory.test.ts` (casos: válido, `body` ausente, `title` vazio, `id` de tipo errado).
- [X] T034 [US6] Aplicar `isValidRedditStory` em `loadStoriesFromDirectory` (`src/scripts/run-pipeline.ts`), rejeitando o arquivo com mensagem identificando o campo ausente/inválido antes de iniciar o TTS.
- [X] T035 [P] [US6] Atualizar `tests/scripts/run-pipeline.test.ts` cobrindo rejeição de história manual malformada antes da etapa de TTS.
- [X] T036 [US6] Alterar `src/modules/reddit/fetchStories.ts`: ao detectar falha de autenticação OAuth (401/403 na etapa de token), lançar `Error` explícito em vez de capturar e retornar `[]`.
- [X] T037 [P] [US6] Atualizar `tests/modules/reddit/fetchStories.test.ts` e `tests/modules/reddit/fetchStories.missing-credentials.test.ts` cobrindo que falha de autenticação lança erro (não retorna `[]`), preservando o isolamento por subreddit para erros de busca não relacionados a autenticação.

**Checkpoint**: Todas as 6 user stories completas e testáveis de forma independente.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Itens de baixo impacto da análise original (`ANALISE-PROJETO.md` §6, "Baixo impacto"), incluídos no escopo desta feature conforme `spec.md` → Assumptions, sem gerar user stories dedicadas.

- [X] T038 [P] Cada `TtsProvider` passa a declarar sua extensão de arquivo de saída (`readonly fileExtension: string`) em `src/modules/tts/ttsProvider.ts`, `src/modules/tts/piperProvider.ts` (`.wav`) e `src/modules/tts/elevenLabsProvider.ts` (`.mp3`); `src/pipeline.ts` usa `deps.ttsProvider.fileExtension` ao montar o caminho de `narration.*` em vez do nome fixo `narration.mp3`.
- [X] T039 [P] Checar `res.ok` na resposta da Pexels em `src/modules/video/backgroundVideoProvider.ts`, lançando erro claro em caso de HTTP não-2xx (401/429/etc.) em vez de erro de parsing obscuro.
- [X] T040 [P] Prefixar a URL com `--` no `spawn` do yt-dlp em `src/scripts/download-background-pack.ts`, evitando argument injection se a URL começar com `-`.
- [X] T041 [P] Adicionar guard contra clipes de duração zero no loop de `pickClips` em `src/modules/video/localBackgroundProvider.ts`, evitando loop infinito quando todos os clipes indexados têm duração 0.
- [X] T042 [P] Trocar o download do vídeo de fundo da Pexels em `src/pipeline.ts` (`downloadBackgroundVideo`) de `Buffer.from(await res.arrayBuffer())` para streaming (`Readable.fromWeb(res.body).pipe(createWriteStream(...))`).
- [X] T043 [P] Testes unitários cobrindo T038–T042 nos respectivos arquivos de teste já existentes (`tests/modules/tts/piperProvider.test.ts`, `tests/modules/tts/elevenLabsProvider.test.ts`, `tests/modules/video/backgroundVideoProvider.test.ts`, `tests/scripts/download-background-pack.test.ts`, `tests/modules/video/localBackgroundProvider.test.ts`, `tests/pipeline.test.ts`).
- [X] T044 Rodar o roteiro completo de `quickstart.md` (todas as US1–US6) e registrar em `docs/testing.md` o que foi validado manualmente (fluxo de vídeo/áudio real, conforme exigido pela constituição §Fluxo de Desenvolvimento e Qualidade).
- [X] T045 Verificação final: `npx tsc --noEmit` e `yarn test:coverage` (100% de cobertura) na raiz do repositório antes de considerar a feature concluída.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — roda primeiro.
- **Foundational (Phase 2)**: Vazia — nenhuma tarefa bloqueante além do Setup.
- **User Stories (Phase 3–8)**: Todas podem começar após o Setup (T001). Não há dependência técnica entre US1–US6 (tocam módulos distintos), mas a ordem de prioridade recomendada é P1 → P1 → P2 → P2 → P2 → P3 (US1, US2, US3, US4, US5, US6).
- **Polish (Phase 9)**: Depende de todas as user stories desejadas estarem completas (T038 depende de US1–US2 estarem estáveis apenas por tocar `pipeline.ts` na mesma área; os demais itens de Polish são independentes entre si).

### User Story Dependencies

- **US1 (P1)**: Sem dependência de outra story.
- **US2 (P1)**: Sem dependência de outra story.
- **US3 (P2)**: Sem dependência de outra story (toca `video/`, `pipeline.ts` em ponto diferente de US1).
- **US4 (P2)**: Sem dependência de outra story.
- **US5 (P2)**: Assume que US4 já decidiu Yarn como gerenciador oficial (`yarn.lock`) para o workflow de CI funcionar corretamente — recomenda-se completar US4 antes de US5, embora não seja um bloqueio técnico rígido (o workflow pode ser escrito e ajustado depois).
- **US6 (P3)**: Sem dependência de outra story.

### Within Each User Story

- Utilitário/validação nova antes do ponto de uso (ex.: T002 antes de T004; T013 antes de T015; T032 antes de T034).
- Testes marcados [P] podem ser escritos em paralelo com a tarefa de implementação correspondente ou logo em seguida, seguindo o padrão já usado no repositório (teste espelhando o módulo).
- Story completa e validada (checkpoint) antes de seguir para a próxima, se a equipe for sequencial.

### Parallel Opportunities

- T003 pode rodar em paralelo com T002 sendo finalizado (mesma tarefa lógica, mas normalmente feito em sequência — marcado [P] pois é um arquivo de teste separado).
- Dentro de cada story, todas as tarefas de teste marcadas [P] em arquivos diferentes dos demais podem ser feitas em paralelo entre si.
- US1, US2, US3, US4, US5 e US6 podem ser trabalhadas em paralelo por desenvolvedores diferentes após T001, já que tocam arquivos majoritariamente distintos (única sobreposição: `src/pipeline.ts`, tocado por US1/T004, US3/T019 e Polish/T038/T042 — coordenar para evitar conflito de merge nesse arquivo específico).
- Todas as tarefas de Polish (T038–T043) marcadas [P] podem rodar em paralelo entre si.

---

## Parallel Example: User Story 1

```bash
# Depois de T002 (utilitário assertSafeId criado):
Task: "Testes unitários de assertSafeId em tests/modules/shared/assertSafeId.test.ts"
Task: "Atualizar tests/scripts/publish.test.ts cobrindo jobId malicioso"
Task: "Atualizar tests/scripts/discard.test.ts cobrindo jobId malicioso"
Task: "Atualizar tests/scripts/regenerate-with-elevenlabs.test.ts cobrindo jobId malicioso"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Completar Phase 1 (Setup).
2. Completar Phase 3 (US1) — fecha a única vulnerabilidade real identificada (path traversal/injeção ffmpeg).
3. Completar Phase 4 (US2) — fecha o risco financeiro direto (bypass de cota).
4. **PARAR e VALIDAR**: rodar `quickstart.md` §US1 e §US2 independentemente.
5. Este é o MVP de segurança/custo da feature — pode ser entregue isoladamente antes das demais stories.

### Incremental Delivery

1. Setup → Foundational (vazia) → Foundation pronta.
2. US1 → testar independentemente → MVP de segurança.
3. US2 → testar independentemente → MVP de custo.
4. US3 → testar independentemente → ganho de performance mensurável (SC-003).
5. US4 → testar independentemente → instalação previsível.
6. US5 → testar independentemente → CI ativo.
7. US6 → testar independentemente → diagnósticos claros.
8. Polish (T038–T045) → fecha os itens de baixo impacto e valida tudo de ponta a ponta via `quickstart.md`.

### Parallel Team Strategy

Com múltiplos desenvolvedores, após T001:

- Dev A: US1 (T002–T012)
- Dev B: US2 (T013–T016)
- Dev C: US3 (T017–T023) — coordenar com Dev A em `src/pipeline.ts`
- Dev D: US4 (T024–T029) + US5 (T030–T031)
- Dev E: US6 (T032–T037)

---

## Notes

- [P] = arquivos diferentes, sem dependência de tarefa incompleta.
- [Story] mapeia cada tarefa à user story correspondente para rastreabilidade.
- Cada user story é completável e testável de forma independente (ver seção "Independent Test" de cada fase e `quickstart.md`).
- Único ponto de possível conflito de merge entre stories: `src/pipeline.ts` (tocado por US1/T004, US3/T019, Polish/T038/T042) — coordenar ordem de commit se trabalhado em paralelo.
- Commitar após cada tarefa ou grupo lógico coerente, conforme "Commits atômicos" da constituição.
- Rodar `npx tsc --noEmit` e `yarn test:coverage` antes de qualquer commit (constituição, §Fluxo de Desenvolvimento e Qualidade).
