# reddit-story-pipeline

Pipeline: Reddit → TTS híbrido (Piper / ElevenLabs) → legenda com destaque de
palavra (WhisperX) → vídeo vertical (ffmpeg) → revisão manual → publicação.

📚 **Documentação completa em [`docs/`](docs/README.md)** — arquitetura,
referência de módulos, modelo de dados, variáveis de ambiente e CLI.
Roadmap de fases (spec-driven) em [`specs/00-overview.md`](specs/00-overview.md).

## Fluxo

```
Reddit (OAuth) ou histórias manuais (--input)
   → TTS (Piper, padrão) → WhisperX (timestamp por palavra) → montagem do vídeo (ffmpeg)
   → REVISÃO MANUAL do vídeo final (storage/pending-review)
        ├─ yarn run publish <jobId>                  → publicar (Piper ficou bom)
        ├─ yarn regenerate:elevenlabs <jobId>     → gera de novo com ElevenLabs, cria novo job p/ revisão rápida
        └─ yarn discard <jobId>                   → descarta
```

Detalhado em [`docs/architecture.md`](docs/architecture.md).

## Dependências externas (instalar fora do yarn)

- **ffmpeg** — `apt install ffmpeg` (ou equivalente do seu SO), precisa ter suporte a `libx264` e ao filtro `subtitles`.
- **Piper TTS** — binário + modelo de voz pt-BR ([github.com/rhasspy/piper](https://github.com/rhasspy/piper)). Aponte o caminho do modelo em `PIPER_MODEL_PATH`.
- **WhisperX** — `pip install whisperx` (usado por `scripts/transcribe.py`; combina whisper + forced alignment via wav2vec2 para timestamp por palavra mais preciso).
- **Conta ElevenLabs** (opcional, só para o caminho 2) — chave de API + `voice_id` de uma voz em português.
- **Conta Pexels** (gratuita) — chave de API para busca de vídeo de fundo. Só necessária com `BACKGROUND_SOURCE=pexels` (padrão).
- **yt-dlp** (opcional) — `pipx install yt-dlp`, usado por `yarn download:background-pack` para baixar um pack próprio de vídeos de fundo de uma playlist do YouTube (fonte `BACKGROUND_SOURCE=local`).

Referência completa de variáveis de ambiente em [`docs/environment.md`](docs/environment.md).

## Setup

```bash
yarn install
cp .env.example .env   # preencher com suas chaves/paths
```

## Uso

```bash
yarn generate                                                  # busca historias no Reddit e gera com Piper
yarn generate --input storage/manual-stories                        # usa historias manuais (1 arquivo .json por historia, sem depender do Reddit)
yarn generate --input storage/manual-stories --story manual-0002    # usa apenas a historia com esse id (ou nome de arquivo)
# ... revisar os videos em storage/pending-review ...
yarn run publish <jobId>                # caminho 1
yarn regenerate:elevenlabs <jobId>  # caminho 2
yarn discard <jobId>                # caminho 3
yarn download:background-pack --url <playlist>              # baixa pack proprio de videos de fundo (yt-dlp)
yarn download:background-pack --url <playlist> --limit 5    # baixa so os 5 primeiros videos da playlist
yarn index:background-pack                          # indexa cortes de cena do pack baixado
yarn generate --background-source local           # usa o pack local em vez do Pexels
yarn test
```

Referência de cada comando em [`docs/cli.md`](docs/cli.md).

## Notas de implementação

- O TTS é plugável (`TtsProvider`) — trocar de Piper para ElevenLabs é só injetar outra implementação, o resto do pipeline (legendas, vídeo) não muda.
- A legenda queimada no vídeo tem destaque de palavra (estilo Reels/Shorts), gerada a partir do timestamp por palavra do WhisperX — ver [`docs/captions-highlight.md`](docs/captions-highlight.md).
- A cota mensal do ElevenLabs é controlada localmente em `storage/elevenlabs-quota.json`, via `QuotaTracker`, para nunca estourar o free tier sem perceber.
- A fila de revisão é só pastas no filesystem (`storage/pending-review` etc). Simples de propósito — se o volume crescer, trocar por SQLite + uma UI leve.
- Vários trechos têm `TODO` deliberado — este é um esqueleto funcional na estrutura, não uma implementação 100% pronta para produção. Lista completa em [`docs/roadmap.md`](docs/roadmap.md).
