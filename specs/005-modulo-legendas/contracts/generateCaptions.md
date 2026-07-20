# Contract: generateCaptions

Interface de função exposta pelo módulo de legendas para o restante do
pipeline (composição de vídeo, fase 07; orquestrador, fase 08).

```ts
function generateCaptions(
  audioFilePath: string,
  outputSrtPath: string,
  modelSize: string
): Promise<CaptionResult>
```

## Comportamento esperado

- Resolve com um `CaptionResult` contendo `words` (não vazio para áudio
  com fala reconhecível) e `srtFilePath === outputSrtPath`.
- O arquivo em `outputSrtPath` é um `.srt` válido no formato SubRip
  padrão (`HH:MM:SS,mmm --> HH:MM:SS,mmm`) — consumível diretamente pelo
  filtro `subtitles` do ffmpeg (fase 07).
- Um arquivo `${outputSrtPath}.words.json` é escrito com a mesma lista
  retornada em `words`, para uso futuro em legenda com destaque de
  palavra (ASS customizado).
- Idioma da transcrição e do alinhamento é sempre português (`pt`).

## Erros

| Cenário | Comportamento esperado |
|---|---|
| Arquivo de áudio inexistente ou corrompido | Rejeita com erro identificável |
| Palavra sem timestamp confiável (ruído, corte) | Descartada da lista `words`; não interrompe o processo |
| Modelo de alinhamento pt-BR ausente no ambiente | Rejeita com erro do próprio WhisperX (pré-requisito de ambiente, fora do controle desta função) |

## Contrato do script auxiliar: `scripts/transcribe.py`

```
python3 scripts/transcribe.py --audio <path> --model <size> \
  --out-srt <path.srt> --out-json <path.words.json> [--language pt]
```

Produz os dois arquivos de saída (`--out-srt`, `--out-json`) e sai com
código 0 em caso de sucesso. `generateCaptions` depende deste contrato de
CLI permanecer estável.
