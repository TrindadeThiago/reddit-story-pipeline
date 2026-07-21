# Legendas com destaque de palavra

## O problema

O WhisperX (via `scripts/transcribe.py`) devolve dois artefatos:

- um `.srt` "legenda tradicional" — um bloco de texto por **segmento**
  (frase inteira, ~4-10s), formato padrão SubRip;
- um `.words.json` — timestamp (`startSeconds`/`endSeconds`) por
  **palavra individual**, obtido via forced alignment (wav2vec2), bem mais
  preciso que a segmentação do whisper puro.

O estilo de legenda usado em vídeos curtos (Reels/TikTok/Shorts) — poucas
palavras na tela, com a palavra sendo falada naquele instante destacada
visualmente — precisa do segundo dado, não do primeiro. Queimar o `.srt`
puro no vídeo (que é o que `composeVideo` fazia antes desta funcionalidade)
mostra a frase inteira parada na tela por vários segundos, sem nenhum
destaque — não é o efeito desejado.

## A solução: gerar um `.ass` com highlight por palavra

`buildHighlightedAss` (`src/modules/captions/buildHighlightedAss.ts`)
converte `CaptionWord[]` num arquivo `.ass` (Advanced SubStation Alpha, um
formato de legenda com suporte a estilo rico, reconhecido nativamente pelo
filtro `subtitles` do ffmpeg/libass).

### Algoritmo

1. Agrupa as palavras em blocos de `WORDS_PER_LINE` (padrão: **4**) — cada
   bloco é uma "tela" de legenda.
2. Para cada bloco, gera **uma linha `Dialogue` por palavra do bloco**: a
   janela de tempo dessa linha vai do `startSeconds` daquela palavra até o
   `startSeconds` da **próxima** palavra do bloco (ou o `endSeconds` dela
   mesma, se for a última do bloco) — isso evita um "flash" apagado no
   pequeno intervalo de silêncio entre palavras.
3. O texto de cada linha é o bloco inteiro concatenado, com a palavra ativa
   envolvida em tags de override de cor ASS:
   `{\c&H00D7FF&}palavra{\c&HFFFFFF&}` — as demais palavras do bloco ficam
   na cor base (branco).

Resultado: ao reproduzir o vídeo, o espectador vê o bloco de até 4 palavras
na tela, e a cor da palavra ativa "acompanha" a fala, palavra a palavra.

### Exemplo de saída

```
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,90,&HFFFFFF&,&HFFFFFF&,&H000000&,&H00000000&,1,0,0,0,100,100,0,0,1,6,0,8,80,80,1060,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.03,0:00:00.37,Default,,0,0,0,,{\c&H00D7FF&}passei{\c&HFFFFFF&} uma década inteira
Dialogue: 0,0:00:00.37,0:00:00.47,Default,,0,0,0,,passei {\c&H00D7FF&}uma{\c&HFFFFFF&} década inteira
Dialogue: 0,0:00:00.47,0:00:00.85,Default,,0,0,0,,passei uma {\c&H00D7FF&}década{\c&HFFFFFF&} inteira
Dialogue: 0,0:00:00.85,0:00:01.13,Default,,0,0,0,,passei uma década {\c&H00D7FF&}inteira{\c&HFFFFFF&}
```

### Onde isso entra no pipeline

```
generateCaptions()
  → transcribe.py (WhisperX)         → captions.srt + captions.srt.words.json
  → buildHighlightedAss(words, ...)  → captions.ass
  → CaptionResult { srtFilePath, assFilePath, words }

composeVideo({ captionsAssPath: captions.assFilePath, ... })
  → ffmpeg -vf "...,subtitles=captions.ass" → final.mp4
```

O `.srt` continua sendo gerado e fica salvo no job (`captions.srt`), mas
**não** é usado na composição — só o `.ass` é queimado no vídeo.

## Formato de cor ASS

Cores em `.ass` usam a ordem **BGR** (não RGB), no formato `&HBBGGRR&`:

| Constante | Valor | Cor visual |
|---|---|---|
| `HIGHLIGHT_COLOR` | `&H00D7FF&` | amarelo/laranja vibrante (RGB `#FFD700`-ish) |
| `BASE_COLOR` | `&HFFFFFF&` | branco |

## Customizando

Tudo fica em `src/modules/captions/buildHighlightedAss.ts`:

| O que mudar | Onde |
|---|---|
| Cor de destaque | constante `HIGHLIGHT_COLOR` |
| Cor base do texto | constante `BASE_COLOR` |
| Quantas palavras por tela | constante `WORDS_PER_LINE` |
| Fonte, tamanho, posição, contorno | linha `Style: Default,...` no header ASS (`formatAssTimestamp`/header são montados na própria função) |

O `Style` atual (`Fontsize=90`, `Alignment=8` = ancorado no topo-centro,
`MarginV=1060`, `Outline=6`) foi calibrado para o canvas 1080x1920
(`PlayResX`/`PlayResY`) que `composeVideo` usa como saída — com
`PlayResY=1920`, `MarginV=1060` deixa o texto um pouco abaixo do centro do
frame (960), não colado na base. Mudar a resolução de saída sem ajustar
`PlayResX`/`PlayResY` desalinha o posicionamento da legenda.

## Como validar visualmente

Depois de gerar um job, extrair um frame no instante desejado com ffmpeg:

```bash
ffmpeg -y -ss <segundos> -i storage/pending-review/<jobId>/final.mp4 -frames:v 1 -update 1 /tmp/frame.png
```

e inspecionar `/tmp/frame.png` — é assim que esta funcionalidade foi
validada durante o desenvolvimento (comparando o `.ass` gerado com o frame
correspondente, confirmando que a palavra esperada aparece destacada).
