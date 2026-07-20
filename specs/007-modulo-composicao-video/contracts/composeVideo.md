# Contract: composeVideo

Interface de função exposta pelo módulo de vídeo para o restante do
pipeline (orquestrador, fase 08).

```ts
interface ComposeOptions {
  narrationAudioPath: string;
  backgroundVideoPath: string;
  srtCaptionsPath: string;
  outputPath: string;
}

function composeVideo(options: ComposeOptions): Promise<ComposedVideo>
```

## Comportamento esperado

- Resolve com `ComposedVideo.videoFilePath === options.outputPath`.
- O arquivo em `outputPath` é um `.mp4` válido, 1080x1920, H.264/AAC.
- Duração do vídeo final é igual à duração de `narrationAudioPath`.
- Legenda de `srtCaptionsPath` aparece embutida e sincronizada.

## Erros

| Cenário | Comportamento esperado |
|---|---|
| `narrationAudioPath` não existe | Rejeita identificando esse caminho especificamente (FR-006) |
| `backgroundVideoPath` não existe | Rejeita identificando esse caminho especificamente (FR-006) |
| `srtCaptionsPath` não existe | Rejeita identificando esse caminho especificamente (FR-006) |
| Legenda vazia (sem linhas) | Vídeo é gerado normalmente, sem texto sobreposto — não é erro |
| ffmpeg falha por outro motivo (codec, filtro não suportado) | Rejeita com o erro original do ffmpeg |
