# Data Model: Fila de Revisão Manual

## Job na fila de revisão (pasta em disco)

Não é um tipo TS novo — é a representação em disco de um `PipelineJob`
(fase 08).

| Item | Descrição |
|---|---|
| `<estado>/<jobId>/job.json` | Serialização JSON do `PipelineJob` completo (história, narração, legenda, vídeo) |
| `<estado>/<jobId>/narration.mp3` | Artefato de áudio (referenciado por `job.narration.audioFilePath`) |
| `<estado>/<jobId>/captions.srt` | Artefato de legenda (referenciado por `job.captions.srtFilePath`) |
| `<estado>/<jobId>/background.mp4` | Vídeo de fundo baixado (fase 08) |
| `<estado>/<jobId>/final.mp4` | Vídeo final (referenciado por `job.video.videoFilePath`) |

`<estado>` é um dos quatro diretórios: `pending-review`, `approved`,
`published`, `discarded`.

## Estado do job (máquina de estados)

```
pending-review --[moveToApproved]--> approved --[moveToPublished]--> published
pending-review --[moveToDiscarded]--> discarded
```

**Regras** (FR-004, FR-005):
- Um job só pode ser aprovado a partir de `pending-review`.
- Um job só pode ser publicado a partir de `approved`.
- Um job só pode ser descartado a partir de `pending-review`.
- Após qualquer transição, a pasta existe em exatamente um estado.
