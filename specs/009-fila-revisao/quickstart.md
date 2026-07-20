# Quickstart: Fila de Revisão Manual

Guia para validar as User Stories 1, 2 e 3 do spec.md contra
`src/modules/review/reviewQueue.ts`.

## Pré-requisitos

- Nenhum pré-requisito externo — apenas sistema de arquivos local.

## Validação — User Story 1 (pasta previsível)

1. Construir um `PipelineJob` de teste (pode ser um objeto simples, sem
   rodar o pipeline inteiro) e chamar `enqueueForReview(job)`.
   - **Resultado esperado**: pasta `storage/pending-review/<jobId>/`
     passa a existir com `job.json` (cenário 1).
2. Chamar `readPendingJob(job.jobId)`.
   - **Resultado esperado**: objeto retornado é igual ao `job` original,
     incluindo `story` (cenário 2).

## Validação — User Story 2 (movimentação entre estados)

1. A partir do job enfileirado acima, chamar `moveToApproved(jobId)`.
   - **Resultado esperado**: pasta existe em `storage/approved/<jobId>/`
     e não existe mais em `storage/pending-review/<jobId>/` (cenário 1).
2. Chamar `moveToPublished(jobId)`.
   - **Resultado esperado**: pasta existe em `storage/published/<jobId>/`
     e não existe mais em `storage/approved/<jobId>/` (cenário 2).
3. Repetir o ciclo com um novo job, chamando `moveToDiscarded(jobId)`
   diretamente a partir de `pending-review`.
   - **Resultado esperado**: pasta existe em `storage/discarded/<jobId>/`
     e não existe mais em `storage/pending-review/<jobId>/` (cenário 3).

## Validação — User Story 3 (erro claro para job inexistente)

1. Chamar `moveToApproved("job-que-nao-existe")`.
   - **Resultado esperado**: erro claro identificando o caminho de origem
     não encontrado (cenário 1).
2. Chamar `moveToPublished(jobId)` duas vezes seguidas para o mesmo job.
   - **Resultado esperado**: a segunda chamada falha com erro claro (o
     job já não está mais em `approved` após a primeira).

## Critério de conclusão da fase

O ciclo completo (enqueue → read → approve → publish) e o ciclo
alternativo (enqueue → discard) completam sem intervenção manual; nenhuma
pasta duplicada sobra em nenhum estado.
