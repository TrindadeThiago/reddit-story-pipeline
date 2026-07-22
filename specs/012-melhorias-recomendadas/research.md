# Research: Melhorias Recomendadas

Todas as ambiguidades de escopo já foram resolvidas na fase `/speckit-clarify` (ver `spec.md` → Clarifications). Esta fase cobre decisões técnicas de implementação necessárias antes do desenho (Phase 1).

## 1. Whitelist de `jobId`/`story.id`

- **Decision**: Regex única `^[A-Za-z0-9_-]+$`, aplicada via uma função utilitária compartilhada (`assertSafeId(id: string, field: string): void`) chamada em todos os pontos de entrada: criação do `jobId` em `pipeline.ts`, e leitura do `jobId` de argv em `publish.ts`, `discard.ts`, `regenerate-with-elevenlabs.ts`.
- **Rationale**: É a mesma whitelist já sugerida na análise original; cobre o caractere `/` (bloqueia traversal), `.` (bloqueia `..`), e todos os caracteres especiais de filtergraph do ffmpeg (`:`, `'`, `,`, `[`, `]`). Nomes de subpastas do Node/filesystem não precisam de mais que isso.
- **Alternatives considered**:
  - Sanitizar (remover caracteres inválidos) em vez de rejeitar: rejeitado — mascarar um `id` malicioso ainda poderia colidir com outro job ou confundir a revisão manual; falhar alto e cedo é mais seguro e mais simples de testar.
  - Validar só no ponto de criação do `jobId` (não nos comandos de CLI): rejeitado — `publish`/`discard` aceitam `jobId` diretamente do usuário via argv, um ponto de entrada independente que a análise já identificou como explorável mesmo com a criação corrigida.

## 2. Escape do caminho de legendas no filtergraph do ffmpeg

- **Decision**: Como a whitelist de `jobId` (item 1) já impede qualquer caractere especial de filtergraph no caminho (o `.ass` vive em `storage/pending-review/<jobId>/captions.ass`), nenhum escaping adicional é necessário além de garantir que o próprio diretório `storage/` não contenha esses caracteres (invariante do repositório, não do input do usuário).
- **Rationale**: Resolver a causa raiz (o `jobId` não sanitizado) elimina a superfície de ataque sem precisar reimplementar um escaper de filtergraph do ffmpeg (frágil e fácil de errar).
- **Alternatives considered**: Escapar `:`, `'`, `,`, `[` no caminho antes de interpolar na string do filtro — rejeitado como camada adicional desnecessária uma vez que a causa raiz (jobId livre) é fechada; pode ser revisitado se o projeto um dia aceitar caminhos de usuário fora da whitelist.

## 3. Validação do limite de cota do ElevenLabs

- **Decision**: Mover a validação de `ELEVENLABS_MONTHLY_CHAR_LIMIT` para dentro do construtor de `QuotaTracker`, usando `Number.isFinite(limit) && limit > 0` como condição de aceite; lançar `Error` imediato e descritivo caso contrário. O parsing de `Number(process.env...)` continua em `regenerate-with-elevenlabs.ts`, mas a validação de negócio migra para o `QuotaTracker`, que é o único responsável por decidir o que é um limite válido.
- **Rationale**: Consistente com o Princípio II da constituição (contratos plugáveis) — a regra de validação pertence ao componente que a usa, não ao script que só faz parsing de env var.
- **Alternatives considered**: Validar no script de entrada (`regenerate-with-elevenlabs.ts`) antes de construir o `QuotaTracker` — rejeitado porque duplicaria a regra em qualquer outro ponto futuro que construa um `QuotaTracker`, e o `QuotaTracker` ficaria com uma invariante não garantida pelo próprio tipo.

## 4. Unificação da composição de vídeo em um único passo

- **Decision**: Fundir a lógica de `buildLocalBackgroundVideo` (concat dos clipes) e `composeVideo` (scale/crop + subtitles + áudio) em um único comando `fluent-ffmpeg`, com um filtergraph que encadeia: `concat` dos clipes de fundo → `scale+crop` para 1080x1920 → `subtitles` → mapeamento do áudio da narração. Os inputs de clipe continuam sendo passados individualmente (como hoje em `assembleClips`), e o novo filtergraph substitui as duas chamadas `.run()` por uma.
- **Rationale**: `fluent-ffmpeg` já suporta múltiplos inputs + `complexFilter` com múltiplos estágios encadeados (label intermediário `[bg]` → `[final]`), então não há necessidade de trocar de biblioteca para atingir SC-003. Isso também elimina o arquivo intermediário de vídeo de fundo (I/O evitado), o que ajuda a atingir a meta de 30% de redução de tempo mesmo sem otimizações adicionais.
- **Alternatives considered**:
  - Manter dois comandos, mas gerar o background já em 1080x1920 (evitando o segundo scale): descartado como solução parcial — ainda recodifica duas vezes, só reduz o trabalho da segunda recodificação.
  - Substituir `fluent-ffmpeg` por `execa`/`spawn` direto como parte desta mudança: fora de escopo desta feature (ver Assumptions do spec — é uma refatoração interna futura); manter `fluent-ffmpeg` minimiza o raio de mudança necessário para atingir SC-003 agora.

## 5. Gerenciador de pacotes: migração para Yarn

- **Decision**: Remover `package-lock.json`, manter `yarn.lock` e o campo `packageManager` existente, atualizar `README.md` (instruções de instalação e todos os comandos `npm run X` → `yarn X`) e verificar se há referências a `npm` em `docs/`.
- **Rationale**: Decisão já tomada em `/speckit-clarify` (Yarn, por já ser o `packageManager` declarado) — menor mudança possível para eliminar a divergência.

## 6. `node-fetch` morto e `engines`

- **Decision**: Remover `node-fetch` de `dependencies` (confirmar com `grep -r "node-fetch" src/` antes de remover); adicionar `"engines": { "node": ">=18" }` ao `package.json`.
- **Rationale**: Todo o código já usa `fetch` global (Node ≥18); a análise já confirmou que não há import de `node-fetch` em nenhum arquivo.

## 7. CI com GitHub Actions

- **Decision**: Workflow `.github/workflows/ci.yml`, gatilho `push` e `pull_request`, um job único: checkout → setup Node (versão compatível com `engines`) → `corepack enable` (para resolver Yarn via `packageManager`) → `yarn install --frozen-lockfile` → `yarn test:coverage` (já existe como script `vitest run --coverage`).
- **Rationale**: Menor configuração possível que satisfaz FR-011/FR-012/SC-005; `corepack` é a forma padrão de garantir a versão de Yarn declarada em `packageManager` sem instalar Yarn manualmente no runner.
- **Alternatives considered**: Configurar branch protection rules como parte da automação — fora de escopo por decisão de `/speckit-clarify` (ação administrativa do mantenedor).

## 8. Validação de shape de histórias manuais (JSON externo)

- **Decision**: Um type guard manual (`isValidRedditStory(value: unknown): value is RedditStory`) verificando presença e tipo string não vazio de `id`, `title`, `body`, chamado em `loadStoriesFromDirectory` (`run-pipeline.ts`) antes de qualquer outro processamento da história.
- **Rationale**: Evita introduzir uma dependência nova (zod) para uma validação de 3 campos; mantém o padrão de "sem dependências pesadas para lógica pura" já usado no projeto. Campos obrigatórios decididos em `/speckit-clarify`: `id`, `title`, `body`.
- **Alternatives considered**: Usar `zod` (sugerido como alternativa na análise original) — descartado por ora como dependência nova não estritamente necessária para 3 campos obrigatórios; pode ser revisitado se o schema de história crescer.

## 9. Propagação de erro de autenticação do Reddit

- **Decision**: Em `fetchStories.ts`, quando a resposta OAuth indicar falha de autenticação (HTTP 401/403 na etapa de token), lançar `Error` explícito em vez de capturar e retornar `[]`. Erros de rede/timeout ao buscar posts de um subreddit específico continuam isolados por subreddit (Princípio IV — não abortam os demais), mas falha de autenticação é uma falha global de configuração, não de um subreddit específico, e deve interromper a execução.
- **Rationale**: Corrige exatamente o cenário descoberto na análise (`fetchStories.ts:74-83` engole erro e retorna `[]`) sem enfraquecer o isolamento de falha por subreddit que já existe para erros de busca legítimos.

## 10. Extensão do arquivo de narração do Piper (baixo impacto, incluído no escopo de US4/US6 conforme Assumptions)

- **Decision**: Cada `TtsProvider` passa a declarar sua própria extensão de arquivo de saída (`narration.wav` para Piper, `narration.mp3` para ElevenLabs), e `pipeline.ts` usa essa extensão ao montar o caminho, em vez de um nome fixo `narration.mp3`.
- **Rationale**: Resolve a inconsistência sem introduzir uma flag nova — cada provider já sabe qual formato gera.
