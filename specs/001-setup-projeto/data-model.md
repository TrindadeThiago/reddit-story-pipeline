# Data Model: Setup do Projeto

Esta fase não introduz entidades de domínio (nenhuma história, narração,
legenda ou vídeo é processada aqui). As "entidades" são estruturas de
configuração e organização usadas pelas fases seguintes.

## Estrutura do projeto

Representa a árvore de pastas fixa que todo o pipeline assume como base.

| Campo | Descrição |
|---|---|
| `src/modules/reddit` | Código da fase 02 (busca de histórias) |
| `src/modules/tts` | Código das fases 03–04 (Piper, ElevenLabs, cota) |
| `src/modules/captions` | Código da fase 05 (legendas WhisperX) |
| `src/modules/video` | Código das fases 06–07 (vídeo de fundo, composição) |
| `src/modules/review` | Código da fase 09 (fila de revisão) |
| `src/scripts` | Scripts CLI da fase 10 |
| `storage/pending-review` | Vídeos aguardando revisão manual |
| `storage/approved` | Vídeos aprovados, aguardando publicação |
| `storage/published` | Vídeos já publicados |
| `storage/discarded` | Vídeos descartados |

## Variáveis de ambiente

Representadas em `.env.example`. Cada variável pertence a uma integração
externa que uma fase futura vai consumir:

| Grupo | Consumido por |
|---|---|
| Reddit (User-Agent, subreddits) | Fase 02 |
| Piper (caminho do binário, modelo de voz) | Fase 03 |
| ElevenLabs (API key, voice id, limite mensal de caracteres) | Fase 04 |
| Pexels (API key) | Fase 06 |
| Whisper/WhisperX (tamanho do modelo) | Fase 05 |

Nenhum valor real de segredo é armazenado nesta fase — apenas os nomes das
chaves, como referência.

## Dependências externas (fora do npm)

| Ferramenta | Usada por | Verificação de instalação |
|---|---|---|
| ffmpeg | Fase 07 (composição de vídeo) | `ffmpeg -version` |
| Piper (binário + modelo pt-BR) | Fase 03 (TTS local) | `piper --help` |
| WhisperX (pip) | Fase 05 (legendas) | `python3 -c "import whisperx"` |
