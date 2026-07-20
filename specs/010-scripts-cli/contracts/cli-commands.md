# Contract: Comandos CLI

Interface exposta ao operador humano via `npm run`.

## `npm run generate`

- **Args**: nenhum.
- **Efeito**: busca histórias (fase 02) e roda `runPipelineForStory`
  (fase 08) com `PiperProvider` (fase 03) para cada uma.
- **Saída esperada**: uma pasta em `storage/pending-review/<jobId>/` por
  história processada com sucesso (FR-001).

## `npm run publish -- <jobId>`

- **Args**: `jobId` (obrigatório).
- **Efeito**: move o job de `pending-review` → `approved` → `published`.
- **Erros**:
  - `jobId` ausente → mensagem de uso, sai sem efeito (FR-005).
  - `jobId` não encontrado em `pending-review` (ex: já publicado antes)
    → erro claro, sem efeito (FR-006).

## `npm run discard -- <jobId>`

- **Args**: `jobId` (obrigatório).
- **Efeito**: move o job de `pending-review` para `discarded`.
- **Erros**: mesmo padrão de `publish`.

## `npm run regenerate:elevenlabs -- <jobId>`

- **Args**: `jobId` (obrigatório, deve estar em `pending-review`).
- **Efeito**: lê o job original (`readPendingJob`), roda
  `runPipelineForStory` de novo com `ElevenLabsProvider` (fase 04),
  criando um **novo** job (novo `jobId`) para revisão rápida. O job
  original permanece intocado.
- **Erros**:
  - `jobId` ausente → mensagem de uso, sai sem efeito (FR-005).
  - `jobId` não encontrado em `pending-review` → erro de leitura
    (FR-006).
