# Contrato: Validação do limite de cota do `QuotaTracker`

Aplica-se a: `new QuotaTracker(statePath, monthlyLimit)`, construído em `regenerate-with-elevenlabs.ts` a partir de `ELEVENLABS_MONTHLY_CHAR_LIMIT`.

## Regra

- `monthlyLimit` DEVE satisfazer `Number.isFinite(monthlyLimit) && monthlyLimit > 0`.
- A validação ocorre no construtor — falha na criação do objeto, não na primeira chamada de `assertHasBudget`/`recordUsage`.

## Comportamento em caso de violação

- O construtor lança `Error` de forma síncrona.
- A mensagem identifica que o limite de cota é inválido e qual valor foi recebido.
- Nenhuma instância de `QuotaTracker` inválida é criada — logo, nenhuma chamada ao ElevenLabs pode ocorrer a partir desse ponto no fluxo de `regenerate-with-elevenlabs.ts`.

## Exemplos

| `ELEVENLABS_MONTHLY_CHAR_LIMIT` | `Number(...)` | Resultado esperado |
|---|---|---|
| `"10000"` | `10000` | Aceito |
| ausente/`undefined` | `NaN` | Rejeitado — `Error` no construtor |
| `""` | `0` | Rejeitado — `Error` no construtor (não é `> 0`) |
| `"abc"` | `NaN` | Rejeitado — `Error` no construtor |
| `"-500"` | `-500` | Rejeitado — `Error` no construtor |
