# Contract: runPipelineForStory

Interface de função exposta pelo orquestrador para os scripts CLI (fase
10).

```ts
interface RunPipelineDeps {
  ttsProvider: TtsProvider;
  pexelsApiKey: string;
  whisperModelSize: string;
  backgroundQuery: string;
}

function runPipelineForStory(
  story: RedditStory,
  deps: RunPipelineDeps
): Promise<PipelineJob>
```

## Comportamento esperado

- Resolve com um `PipelineJob` cujos campos `narration`, `captions` e
  `video` estão todos preenchidos.
- Ao resolver, o job já foi enfileirado para revisão (efeito colateral de
  `enqueueForReview`, fase 09) — existe uma pasta
  `storage/pending-review/<jobId>/` com todos os artefatos.
- Trocar apenas `deps.ttsProvider` (Piper ↔ ElevenLabs) entre duas
  chamadas não requer nenhuma outra alteração — mesmo formato de
  resultado.
- Cada chamada produz um `jobId` diferente, mesmo para a mesma `story`.

## Erros

| Cenário | Comportamento esperado |
|---|---|
| `ttsProvider.synthesize` falha | Rejeita identificando a etapa de narração + causa original |
| `generateCaptions` falha | Rejeita identificando a etapa de legenda + causa original |
| `findBackgroundVideo` falha (sem resultado/sem opção vertical) | Rejeita identificando a etapa de busca de vídeo de fundo + causa original |
| Download do vídeo de fundo falha (rede, URL inválida) | Rejeita identificando a etapa de download do vídeo de fundo + causa original |
| `composeVideo` falha (arquivo ausente, erro do ffmpeg) | Rejeita identificando a etapa de composição + causa original |
| `enqueueForReview` falha | Rejeita identificando a etapa de enfileiramento + causa original |
