# Research: Fila de Revisão Manual

Sem marcadores `NEEDS CLARIFICATION` no Technical Context. Decisões abaixo
consolidam o que já está implementado em
`src/modules/review/reviewQueue.ts` e o gap encontrado.

## Decisão: `enqueueForReview` deve criar a pasta de destino (gap a fechar)

- **Decision**: Adicionar `await mkdir(jobDir, { recursive: true })` no
  início de `enqueueForReview`, antes do `writeFile` de `job.json`.
- **Rationale**: A implementação atual escreve `job.json` diretamente em
  `join(PENDING_DIR, job.jobId)` sem garantir que essa pasta exista. Hoje
  isso não quebra porque o orquestrador (fase 08) já chama
  `mkdir(workDir, { recursive: true })` antes de qualquer etapa — e
  `workDir` é exatamente o mesmo caminho que `enqueueForReview` usa. Mas
  essa é uma dependência implícita entre módulos que não deveria existir:
  `enqueueForReview` é uma função exportada com contrato próprio (FR-002),
  usada por qualquer código que monte um `PipelineJob` — se chamada sem
  passar pelo orquestrador (ex: um teste, um script alternativo, uma
  reconstrução manual de job), quebraria com `ENOENT`.
- **Alternatives considered**: Deixar como está, documentando que o
  chamador deve criar a pasta antes — descartado porque contraria
  diretamente a spec original ("`enqueueForReview(job)`: grava `job.json`
  + arquivos do job em `storage/pending-review/<jobId>/`", sem menção a
  pré-condição de pasta já existente).

## Decisão: Erro claro ao mover job inexistente

- **Decision**: Manter o comportamento nativo de `fs.rename` — que já
  rejeita com `ENOENT` incluindo os caminhos de origem e destino — sem
  adicionar uma camada extra de mensagem customizada.
- **Rationale**: O erro nativo do Node já identifica claramente qual
  caminho não foi encontrado (`ENOENT: no such file or directory, rename
  'storage/pending-review/X' -> 'storage/approved/X'`), o que já
  identifica o `jobId` (via caminho) e a operação (via caminhos de origem
  e destino) — suficiente para atender FR-006/SC-003 sem trabalho
  adicional.
- **Alternatives considered**: Envolver cada `moveTo*` em um `try/catch`
  que relança um erro customizado (`Job ${jobId} não encontrado em
  pending-review`) — mais amigável para quem lê o log, mas não
  estritamente necessário já que o erro nativo já é identificável.
  Mantido como melhoria opcional de UX, não como correção obrigatória.

## Decisão: Movimentação via `rename` (sem cópia)

- **Decision**: Manter `fs.rename` para todas as transições de estado.
- **Rationale**: Atende FR-005/SC-002 diretamente — `rename` é atômico
  dentro do mesmo sistema de arquivos e nunca deixa duplicata: a pasta
  simplesmente passa a existir no novo caminho e deixa de existir no
  antigo.
- **Alternatives considered**: Copiar e depois apagar o original —
  descartado por não ser atômico (risco de estado inconsistente se o
  processo for interrompido entre a cópia e a remoção) e por ser mais
  lento sem necessidade, já que `rename` já resolve o caso de uso.

## Decisão: Reconstrução de job via `job.json`

- **Decision**: Manter `readPendingJob` lendo e fazendo `JSON.parse` de
  `job.json` diretamente, sem validação de schema.
- **Rationale**: Atende FR-003 — `job.json` é escrito pelo próprio
  `enqueueForReview` a partir do mesmo tipo `PipelineJob`, então o
  round-trip é confiável sem necessidade de validação adicional dentro do
  fluxo normal do pipeline.
- **Alternatives considered**: Validar o shape do JSON lido (ex: com
  zod) — descartado por adicionar uma dependência nova sem um cenário de
  uso que a justifique (o arquivo não é editado manualmente no fluxo
  normal).
