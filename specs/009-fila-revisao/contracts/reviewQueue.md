# Contract: reviewQueue

Interfaces de função expostas pelo módulo de revisão para o orquestrador
(fase 08) e os scripts CLI (fase 10).

```ts
function enqueueForReview(job: PipelineJob): Promise<string>; // retorna o path da pasta
function readPendingJob(jobId: string): Promise<PipelineJob>;
function moveToApproved(jobId: string): Promise<void>;
function moveToPublished(jobId: string): Promise<void>;
function moveToDiscarded(jobId: string): Promise<void>;
```

## Comportamento esperado

- `enqueueForReview` cria a pasta de destino por conta própria (não
  depende do chamador já tê-la criado) e resolve com o caminho da pasta
  criada.
- `readPendingJob` reconstrói um `PipelineJob` idêntico ao que foi
  enfileirado, incluindo a `RedditStory` original.
- `moveToApproved`/`moveToPublished`/`moveToDiscarded` **movem** (não
  copiam) a pasta — após a operação, ela existe apenas no destino.

## Erros

| Cenário | Comportamento esperado |
|---|---|
| `moveToApproved`/`moveToDiscarded` com `jobId` inexistente em `pending-review` | Rejeita com erro identificando o caminho de origem não encontrado |
| `moveToPublished` com `jobId` inexistente em `approved` | Rejeita com erro identificando o caminho de origem não encontrado |
| `readPendingJob` com `jobId` inexistente | Rejeita (erro de leitura de arquivo) |
