# Research: Módulo de Legendas (WhisperX)

Sem marcadores `NEEDS CLARIFICATION` no Technical Context. Decisões abaixo
consolidam o que já está implementado em `scripts/transcribe.py` e
`src/modules/captions/generateCaptions.ts`, e o gap crítico encontrado.

## Decisão: Formato de timestamp do `.srt` (gap crítico a fechar)

- **Decision**: Formatar `start`/`end` de cada bloco do `.srt` como
  `HH:MM:SS,mmm` (padrão SubRip), em vez de segundos brutos com ponto
  decimal.
- **Rationale**: `scripts/transcribe.py` hoje escreve
  `f"{segment['start']:.3f} --> {segment['end']:.3f}"`, que produz linhas
  como `12.340 --> 15.670`. O formato SRT padrão exige
  `00:00:12,340 --> 00:00:15,670` (horas:minutos:segundos, vírgula para
  milissegundos). Um `.srt` com timestamps fora desse formato não é
  reconhecido como válido pela maioria dos players e, mais importante
  para este pipeline, quebraria o filtro `subtitles` do ffmpeg usado na
  fase 07 — violando FR-001/SC-001 e bloqueando indiretamente SC-004
  (aceito pela fase 07 sem modificação).
- **Alternatives considered**: Gerar apenas o `.words.json` e deixar a
  fase 07 construir a legenda a partir dele — descartado porque a spec
  original já prevê os dois formatos de saída (`.srt` para o caminho
  simples via filtro `subtitles`, `.words.json` para o caminho de
  destaque por palavra via ASS customizado); manter o `.srt` inválido
  quebraria o caminho simples sem necessidade.

## Decisão: Descarte de palavras sem timestamp confiável

- **Decision**: Manter o filtro já implementado em `transcribe.py` — pular
  palavras onde `"start"` ou `"end"` estão ausentes no resultado do
  forced alignment, sem interromper o loop.
- **Rationale**: Atende FR-004/SC-003 diretamente — ruído ou cortes que o
  wav2vec2 não consegue alinhar com confiança geram palavras sem
  `start`/`end`; descartá-las é mais seguro do que inventar um timestamp
  aproximado que ficaria perceptivelmente errado no vídeo final.
- **Alternatives considered**: Interpolar um timestamp aproximado a partir
  das palavras vizinhas — descartado por adicionar complexidade sem
  necessidade clara; a spec original já aceita "descartar" como
  comportamento correto.

## Decisão: `compute_type="int8"` em CPU

- **Decision**: Manter o padrão `device="cpu"`, `compute_type="int8"` já
  codificado em `transcribe.py`.
- **Rationale**: Ambiente de desenvolvimento típico deste pipeline não
  assume GPU disponível; `int8` em CPU é o modo mais compatível do
  WhisperX sem exigir CUDA.
- **Alternatives considered**: `float16` em GPU — já comentado no código
  como alternativa para quem tiver GPU; não é o caminho padrão porque não
  pode ser assumido como disponível.

## Decisão: Caminho relativo do script Python

- **Decision**: Manter `generateCaptions` chamando `"scripts/transcribe.py"`
  como caminho relativo (assume `cwd` na raiz do repo, que é como os
  scripts npm da fase 001/010 rodam via `tsx`).
- **Rationale**: Consistente com o resto do pipeline, que já roda a
  partir da raiz do projeto (`npm run generate`, etc.) — não há indicação
  de que `generateCaptions` seja chamado de um `cwd` diferente.
- **Alternatives considered**: Resolver o caminho com
  `import.meta.url`/`__dirname` para ser independente do `cwd` —
  considerado mais robusto, mas fora do escopo desta correção; pode virar
  um ajuste futuro se algum consumidor rodar fora da raiz do repo.
