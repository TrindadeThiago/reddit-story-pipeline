# reddit-story-pipeline

Pipeline: Reddit → TTS híbrido (Piper / ElevenLabs) → legenda (whisper) → vídeo vertical → revisão manual → publicação.

Ver o roadmap de fases (spec-driven) em [specs/00-overview.md](specs/00-overview.md).

## Fluxo

```
Reddit → seleção da história → TTS (Piper, padrão) → whisper (timestamps) → montagem do vídeo (ffmpeg)
   → REVISÃO MANUAL do vídeo final (storage/pending-review)
        ├─ npm run publish -- <jobId>                  → publicar (Piper ficou bom)
        ├─ npm run regenerate:elevenlabs -- <jobId>     → gera de novo com ElevenLabs, cria novo job p/ revisão rápida
        └─ npm run discard -- <jobId>                   → descarta
```

## Dependências externas (instalar fora do npm)

- **ffmpeg** — `apt install ffmpeg` (ou equivalente do seu SO), precisa ter suporte a `libx264` e ao filtro `subtitles`.
- **Piper TTS** — binário + modelo de voz pt-BR ([github.com/rhasspy/piper](https://github.com/rhasspy/piper)). Aponte o caminho do modelo em `PIPER_MODEL_PATH`.
- **WhisperX** — `pip install whisperx` (usado por `scripts/transcribe.py`; combina whisper + forced alignment via wav2vec2 para timestamp por palavra mais preciso).
- **Conta ElevenLabs** (opcional, só para o caminho 2) — chave de API + `voice_id` de uma voz em português.
- **Conta Pexels** (gratuita) — chave de API para busca de vídeo de fundo.

## Setup

```bash
npm install
cp .env.example .env   # preencher com suas chaves/paths
```

## Uso

```bash
npm run generate                          # busca historias no Reddit e gera com Piper
# ... revisar os videos em storage/pending-review ...
npm run publish -- <jobId>                # caminho 1
npm run regenerate:elevenlabs -- <jobId>  # caminho 2
npm run discard -- <jobId>                # caminho 3
```

## Notas de implementação

- O TTS é plugável (`TtsProvider`) — trocar de Piper para ElevenLabs é só injetar outra implementação, o resto do pipeline (legendas, vídeo) não muda.
- A cota mensal do ElevenLabs é controlada localmente em `storage/elevenlabs-quota.json`, via `QuotaTracker`, para nunca estourar o free tier sem perceber.
- A fila de revisão é só pastas no filesystem (`storage/pending-review` etc). Simples de propósito — se o volume crescer, trocar por SQLite + uma UI leve.
- Vários trechos têm `TODO` — este é um esqueleto funcional na estrutura, não uma implementação 100% pronta para produção (ex: seleção/curadoria de histórias, parametrização da query de vídeo de fundo, upload real para as plataformas).
