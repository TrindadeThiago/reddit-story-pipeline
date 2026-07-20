# Data Model: Módulo de Legendas (WhisperX)

## CaptionWord

Representa uma palavra reconhecida no áudio, com seu intervalo de fala.

| Campo | Tipo | Descrição |
|---|---|---|
| `word` | string | Texto da palavra reconhecida |
| `startSeconds` | number | Momento de início da fala, em segundos |
| `endSeconds` | number | Momento de fim da fala, em segundos |

**Regra de validação** (aplicada na geração, não no tipo): palavras sem
`start`/`end` confiáveis no resultado do forced alignment são descartadas
antes de entrar na lista (FR-004).

## CaptionResult

Representa o resultado completo de uma transcrição.

| Campo | Tipo | Descrição |
|---|---|---|
| `words` | `CaptionWord[]` | Lista de palavras com timestamp, lida de `.words.json` |
| `srtFilePath` | string | Caminho do arquivo `.srt` gerado (formato SubRip válido) |

## Bloco de legenda `.srt` (formato de saída, não um tipo TS)

Cada bloco do arquivo `.srt` segue o padrão SubRip:

```
<índice sequencial>
HH:MM:SS,mmm --> HH:MM:SS,mmm
<texto do segmento>
<linha em branco>
```

O campo de tempo usa vírgula para milissegundos (não ponto), e horas
sempre com 2 dígitos — é este formato que a fase 07 (filtro `subtitles`
do ffmpeg) espera como entrada válida.
