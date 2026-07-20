# Data Model: Módulo TTS — ElevenLabs + controle de cota

## QuotaState (persistido em `storage/elevenlabs-quota.json`)

| Campo | Tipo | Descrição |
|---|---|---|
| `yearMonth` | string (`"YYYY-MM"`) | Mês civil ao qual o contador se refere |
| `charactersUsed` | number | Caracteres já usados no mês corrente |

**Regras**:
- Se `yearMonth` lido do arquivo for diferente do mês atual, o estado
  efetivo é tratado como `{ yearMonth: mêsAtual, charactersUsed: 0 }`
  (FR-006).
- Se o arquivo não existir ou não puder ser lido/parseado, o estado
  efetivo é tratado como zero uso no mês atual (ver `research.md`).

## QuotaTracker (contrato)

| Membro | Tipo | Descrição |
|---|---|---|
| `assertHasBudget` | `(additionalChars: number) => Promise<void>` | Rejeita se `charactersUsed + additionalChars > monthlyLimit` (FR-003, FR-004) — **precisa ser aguardado (`await`) pelo chamador** |
| `recordUsage` | `(chars: number) => Promise<void>` | Persiste `charactersUsed += chars` em disco (FR-005, FR-007) — **precisa ser aguardado (`await`) pelo chamador** |

## NarrationResult (reaproveitado da fase 03)

Sem alterações — `ElevenLabsProvider` popula `provider: "elevenlabs"`,
`audioFilePath` e `charactersUsed`, seguindo o mesmo formato que
`PiperProvider` já usa (FR-002).

## ElevenLabsProvider (implementação)

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | `"elevenlabs"` | Fixo |
| `apiKey` | string | `ELEVENLABS_API_KEY` (fase 001) |
| `voiceId` | string | `ELEVENLABS_VOICE_ID` (fase 001), voz pt-BR |
| `quota` | `QuotaTracker` | Instância injetada, compartilhando o mesmo arquivo de estado entre chamadas |
