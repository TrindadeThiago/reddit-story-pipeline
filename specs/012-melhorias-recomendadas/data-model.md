# Data Model: Melhorias Recomendadas

Esta feature não introduz novas entidades persistentes; ela adiciona regras de validação e um novo formato de erro a entidades já existentes no projeto (`src/types.ts`, `docs/data-model.md`). Nenhuma migração de dados é necessária — os dados existentes em `storage/` continuam válidos.

## Entidades afetadas

### `RedditStory` (existente, `src/types.ts`)

| Campo | Tipo | Regra nova nesta feature |
|---|---|---|
| `id` | `string` | DEVE corresponder a `^[A-Za-z0-9_-]+$` antes de ser usado para compor um `jobId` (FR-001). Histórias com `id` fora desse padrão são rejeitadas antes de qualquer escrita em disco. |
| `title` | `string` | Passa a ser obrigatório (não vazio) quando a história vem de um arquivo JSON manual (FR-013). |
| `body` | `string` | Passa a ser obrigatório (não vazio) quando a história vem de um arquivo JSON manual (FR-013) — já era usado como insumo do TTS, mas não era validado antes. |

Nenhum campo novo é adicionado a `RedditStory`. A mudança é de validação (rejeitar cedo), não de shape.

### `PipelineJob` / `jobId` (existente, `src/types.ts`, `src/pipeline.ts`)

- `jobId` continua sendo `${story.id}-${Date.now()}`, mas agora só é construído **depois** que `story.id` passa pela validação de whitelist (FR-001, FR-002).
- Nenhuma mudança de estrutura de `job.json` — o contrato de dados descrito em `docs/data-model.md` (campos `jobId`, `story`, `narration`, `captions`, `composedVideo`) permanece o mesmo.

### `QuotaState` (existente, `src/modules/tts/quotaTracker.ts`)

- Sem mudança de shape (`{ yearMonth: string; charactersUsed: number }`).
- Nova invariante no construtor de `QuotaTracker`: `monthlyLimit` DEVE ser `Number.isFinite(monthlyLimit) && monthlyLimit > 0` (FR-004). Essa invariante é validada uma vez, na criação do objeto — não em cada chamada de `assertHasBudget`/`recordUsage`.

## Novos artefatos (não-dados, utilitários de código)

Estes não são "entidades" no sentido de dados persistidos, mas fazem parte do desenho já que são consumidos por múltiplos módulos:

- **`assertSafeId(id: string, field: string): void`** (novo utilitário, local exato definido em Phase 2/tasks) — lança `Error` se `id` não casar com `^[A-Za-z0-9_-]+$`. Usado por `pipeline.ts` (criação de `jobId`), `publish.ts`, `discard.ts`, `regenerate-with-elevenlabs.ts` (leitura de `jobId` do argv).
- **`isValidRedditStory(value: unknown): value is RedditStory`** (novo type guard) — verifica presença e tipo de `id`, `title`, `body` como strings não vazias. Usado em `loadStoriesFromDirectory` (`run-pipeline.ts`) antes de processar qualquer história manual.

## Erros novos (contrato de comportamento observável)

| Situação | Antes | Depois |
|---|---|---|
| `jobId`/`story.id` fora da whitelist | Prosseguia, podia escrever fora de `storage/` | `Error` explícito, nenhuma escrita ocorre |
| `ELEVENLABS_MONTHLY_CHAR_LIMIT` inválido | Cota nunca estourava (bug silencioso) | `Error` no construtor de `QuotaTracker`, nenhuma chamada paga ocorre |
| História manual sem `id`/`title`/`body` | Falha tardia e obscura no TTS | `Error` imediato identificando o campo ausente, antes do TTS |
| Falha de autenticação OAuth do Reddit | Retornava `[]`, pipeline reportava sucesso com "0 histórias" | `Error` explícito de autenticação, processo encerra com falha |

Sem transições de estado novas na fila de revisão (`pending-review` → `approved`/`published`/`discarded` permanece igual).
