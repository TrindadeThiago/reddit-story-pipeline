# Research: Módulo TTS — Piper + interface plugável

Sem marcadores `NEEDS CLARIFICATION` no Technical Context. Decisões abaixo
consolidam o que já está implementado em
`src/modules/tts/{ttsProvider,piperProvider}.ts` e o gap identificado.

## Decisão: Como alimentar o texto ao processo do Piper (gap a fechar)

- **Decision**: Usar `child_process.spawn` (ou `execFile` sem a opção
  `input`, escrevendo manualmente em `child.stdin`) para rodar o binário
  Piper, escrevendo o texto no stdin do processo e aguardando ele
  finalizar antes de resolver a promise.
- **Rationale**: A implementação atual chama
  `execFileAsync("piper", [...], { input: text } as any)`. A variante
  assíncrona de `execFile` do Node **não tem** a opção `input` —
  isso só existe em `execFileSync`/`execSync`. O `as any` no código
  mascara esse erro de tipo, mas em runtime o texto provavelmente não
  chega ao Piper via stdin (o próprio código já sinaliza isso com um
  `TODO: ajustar conforme binding real usado`). Isso bloqueia
  diretamente FR-001/SC-001 — sem o texto chegando ao processo, não há
  áudio válido gerado.
- **Alternatives considered**: Usar `execFileSync` (bloqueia a thread
  principal — inaceitável num processo que também lida com I/O de rede
  em outras fases do pipeline); escrever o texto em um arquivo temporário
  e usar a flag de arquivo de entrada do Piper, se existir — mantido como
  alternativa caso o binding via stdin não funcione na prática.

## Decisão: Textos longos

- **Decision**: Nenhum chunking/quebra de texto em blocos dentro deste
  módulo — o texto completo é enviado de uma vez ao Piper.
- **Rationale**: O spec (US1, FR-003) exige suportar textos longos sem
  cortar; o Piper local não tem limite de caracteres conhecido que
  justifique quebrar em blocos nesta fase. Quebra em blocos, se
  necessária, é decisão de pré-processamento fora deste módulo (ver
  Assumptions do spec).
- **Alternatives considered**: Quebrar o texto em parágrafos e concatenar
  os áudios resultantes — descartado por adicionar complexidade
  (sincronizar múltiplos arquivos de áudio) sem evidência de que seja
  necessário.

## Decisão: Contrato `TtsProvider` fixo

- **Decision**: Manter a assinatura já implementada —
  `synthesize(text: string, outputPath: string): Promise<NarrationResult>`
  — sem parâmetros adicionais.
- **Rationale**: É o contrato que a fase 04 (`ElevenLabsProvider`) e a
  fase 08 (orquestrador, via injeção de dependência) vão consumir
  (FR-005). Mudar a assinatura depois exigiria alterar todas as fases
  dependentes.
- **Alternatives considered**: Adicionar opções extras (voz, velocidade)
  na assinatura — descartado por enquanto; nenhum requisito desta fase
  pede parametrização além de texto + caminho de saída.
