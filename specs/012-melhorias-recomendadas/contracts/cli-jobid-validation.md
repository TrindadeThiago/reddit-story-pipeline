# Contrato: Validação de `jobId` nos comandos CLI

Aplica-se a: `npm run publish -- <jobId>` / `yarn publish <jobId>`, `discard`, `regenerate:elevenlabs`, e à criação interna do `jobId` em `runPipelineForStory`.

## Regra

- `jobId` (e `story.id`, usado para compô-lo) DEVE casar com o padrão `^[A-Za-z0-9_-]+$`.
- A validação ocorre **antes** de qualquer chamada a `readFile`, `rename`, `mkdir` ou montagem de comando ffmpeg que use o valor.

## Comportamento em caso de violação

- O comando encerra com código de saída diferente de zero.
- A mensagem de erro identifica claramente: (a) que o `jobId`/`id` é inválido, (b) o valor recebido, (c) o padrão esperado.
- Nenhum arquivo é criado, movido ou lido fora de `storage/` (nem dentro, para o `jobId` rejeitado).

## Exemplos

| Entrada | Resultado esperado |
|---|---|
| `abc123-1721654321000` | Aceito — segue para a operação normal |
| `../../etc/passwd` | Rejeitado — erro antes de qualquer I/O |
| `foo/bar` | Rejeitado — erro antes de qualquer I/O |
| `job:with,filter[chars]` | Rejeitado — erro antes de qualquer I/O |
| `` (vazio) | Rejeitado — erro antes de qualquer I/O |

## Compatibilidade

- `jobId`s já existentes em `storage/` (formato `${story.id}-${timestamp}`) continuam válidos desde que `story.id` original já respeitasse a whitelist — o que é o caso de todo `id` vindo da API do Reddit (alfanumérico) e de qualquer história manual usada até hoje no projeto (verificar `storage/` local antes de aplicar em produção, se houver jobs pendentes com `id` fora do padrão).
