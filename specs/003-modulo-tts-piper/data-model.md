# Data Model: Módulo TTS — Piper + interface plugável

## NarrationResult

Representa o áudio gerado a partir de um texto — resultado comum a
qualquer `TtsProvider` (Piper nesta fase, ElevenLabs na fase 04).

| Campo | Tipo | Descrição |
|---|---|---|
| `provider` | `"piper" \| "elevenlabs"` | Qual provedor gerou o áudio (FR-004) |
| `audioFilePath` | string | Caminho do arquivo de áudio gerado |
| `charactersUsed` | number | Quantidade de caracteres processados (métrica; usado pela fase 04 para controle de cota) |

## TtsProvider (contrato)

Não é uma entidade de dados, mas o contrato que qualquer provedor de
narração implementa (FR-005).

| Membro | Tipo | Descrição |
|---|---|---|
| `name` | `"piper" \| "elevenlabs"` | Identifica o provedor, igual ao `NarrationResult.provider` |
| `synthesize` | `(text: string, outputPath: string) => Promise<NarrationResult>` | Gera o áudio e resolve com o resultado |

## PiperProvider (implementação)

Implementação concreta do contrato acima para esta fase.

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | `"piper"` | Fixo |
| `modelPath` | string | Caminho do modelo de voz pt-BR (`PIPER_MODEL_PATH`, fase 001) |
