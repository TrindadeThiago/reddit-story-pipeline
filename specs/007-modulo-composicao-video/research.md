# Research: Módulo de Composição de Vídeo (ffmpeg)

Sem marcadores `NEEDS CLARIFICATION` no Technical Context. Decisões abaixo
consolidam o que já está implementado em
`src/modules/video/composeVideo.ts` e o ponto a reforçar.

## Decisão: Checagem explícita de arquivos de entrada (ponto a reforçar)

- **Decision**: Antes de iniciar o processo `ffmpeg`, verificar
  explicitamente (`fs.existsSync` ou `fs.promises.access`) que
  `narrationAudioPath`, `backgroundVideoPath` e `srtCaptionsPath` existem,
  rejeitando a promise com uma mensagem que identifica qual caminho
  especificamente está faltando, antes de sequer chamar `.run()`.
- **Rationale**: A implementação atual depende inteiramente do evento
  `error` do `fluent-ffmpeg`/ffmpeg para sinalizar arquivo ausente. Na
  prática, o ffmpeg costuma reportar "No such file or directory" com o
  caminho problemático no stderr, então o comportamento atual **já
  funciona na maioria dos casos** — mas o texto exato do erro depende de
  qual input o ffmpeg tenta abrir primeiro e de como o `fluent-ffmpeg`
  formata a mensagem, o que não garante de forma determinística que FR-006
  seja atendido para os três arquivos de entrada (áudio, vídeo, legenda)
  de forma consistente. Uma checagem explícita antes de rodar o ffmpeg é
  mais direta e testável, e falha mais rápido (sem esperar o ffmpeg
  inicializar).
- **Alternatives considered**: Confiar apenas no erro do ffmpeg — mantido
  como fallback (não removido), mas não é suficiente sozinho para
  satisfazer FR-006/SC-004 de forma garantida.

## Decisão: Crop central para 1080x1920

- **Decision**: Manter o filtro já implementado —
  `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`.
- **Rationale**: Atende FR-002/FR-003 — escala mantendo proporção até
  cobrir 1080x1920 e depois corta o excesso centralizado, evitando
  distorção da imagem.
- **Alternatives considered**: `force_original_aspect_ratio=decrease` +
  padding (barras pretas) — descartado porque o objetivo é preencher a
  tela toda (formato vertical "cheio"), não deixar barras.

## Decisão: Duração determinada pela narração

- **Decision**: Manter `-stream_loop -1` no vídeo de fundo (repete
  indefinidamente) combinado com `-shortest` na saída, que corta no
  stream mais curto — como o áudio de narração não é loopado, ele passa a
  ser o fator limitante.
- **Rationale**: Atende FR-003/SC-002 diretamente — o vídeo final sempre
  dura exatamente o tempo da narração, seja o fundo mais curto (loopado)
  ou mais longo (cortado pelo `-shortest`).
- **Alternatives considered**: Calcular a duração da narração
  antecipadamente e usar `-t <duração>` explícito — descartado por ser
  redundante; `-shortest` já resolve isso sem precisar sondar a duração
  do áudio antes.

## Decisão: Legenda via filtro `subtitles` padrão

- **Decision**: Manter `subtitles=${srtCaptionsPath}` sem estilização
  customizada (ASS) nesta fase.
- **Rationale**: Atende FR-004 com o mínimo necessário; a spec original já
  prevê que o estilo "palavra destacada" (ASS customizado usando
  `.words.json` da fase 05) é uma fase extra futura, não desta.
- **Alternatives considered**: Gerar um arquivo ASS customizado agora —
  fora de escopo desta fase (ver spec § Assumptions).
