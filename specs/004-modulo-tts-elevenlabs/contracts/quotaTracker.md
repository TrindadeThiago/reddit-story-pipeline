# Contract: QuotaTracker

Interface exposta pelo módulo TTS para controle de cota mensal do
ElevenLabs. Consumida por `ElevenLabsProvider` (este módulo) e, no
futuro, potencialmente por qualquer outro provedor pago que precise do
mesmo controle.

```ts
class QuotaTracker {
  assertHasBudget(additionalChars: number): Promise<void>; // lança erro se estourar
  recordUsage(chars: number): Promise<void>;
}
```

## Ordem de chamada obrigatória (contrato comportamental)

`ElevenLabsProvider.synthesize` MUST, nesta ordem:

1. `await quota.assertHasBudget(text.length)` — **antes** de qualquer
   chamada à API do ElevenLabs. Se rejeitar, a síntese para aqui, sem
   nenhuma requisição de rede feita.
2. Chamar a API do ElevenLabs e escrever o áudio em disco.
3. `await quota.recordUsage(text.length)` — só após o áudio ter sido
   escrito com sucesso.

| Cenário | Comportamento esperado |
|---|---|
| Síntese cabe no saldo restante | `assertHasBudget` resolve; síntese prossegue normalmente |
| Síntese estouraria o saldo restante | `assertHasBudget` rejeita; **nenhuma chamada à API do ElevenLabs é feita**; `recordUsage` nunca é chamado |
| API do ElevenLabs falha após `assertHasBudget` passar | `recordUsage` **não** é chamado — falha não consome cota |
| Mês civil muda entre chamadas | Próxima `assertHasBudget`/`recordUsage` opera sobre um contador zerado |
