# Ambiente e dependências

## Setup

```bash
npm install
cp .env.example .env   # preencher com suas chaves/paths
```

Requer Node.js (ESM + `tsx`, ver `package.json`) e as dependências externas
abaixo instaladas fora do `npm`.

## Dependências externas

| Dependência | Necessária para | Instalação |
|---|---|---|
| **ffmpeg** | `composeVideo` (sempre) | `apt install ffmpeg` (ou equivalente). Precisa de suporte a `libx264` e ao filtro `subtitles` (usado para queimar o `.ass`). |
| **Piper TTS** | `PiperProvider` (fluxo padrão, sempre) | Binário + modelo de voz pt-BR — [github.com/rhasspy/piper](https://github.com/rhasspy/piper). Caminho do modelo em `PIPER_MODEL_PATH`. |
| **WhisperX** | `scripts/transcribe.py` (sempre) | `pip install whisperx`. Recomendado em venv isolado (ex: `.venv-whisperx/`) para não afetar o Python global. Pesado em RAM — ver nota abaixo. |
| **Conta ElevenLabs** | `ElevenLabsProvider` (só no caminho 2 da revisão) | Chave de API + `voice_id` de uma voz em português. |
| **Conta Pexels** | `findBackgroundVideo` (sempre) | Gratuita — [pexels.com/api](https://www.pexels.com/api/). |
| **App Reddit "script"** | `fetchStories` (só se **não** usar `--input`) | Criar em [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) → `client_id`/`client_secret`. |

### Nota sobre RAM e WhisperX

`scripts/transcribe.py` roda whisper + VAD + forced alignment (wav2vec2),
tudo em `torch`, localmente. Em máquinas com pouca memória (observado: 3.8GB
total insuficiente com `--model base`, processo morto pelo OOM killer), use
`WHISPER_MODEL_SIZE=tiny` e feche outros processos pesados antes de rodar.
Isso não é uma limitação de implementação — é custo de recurso do modelo em
si.

### Nota sobre qual `python3` é usado

`generateCaptions` roda `scripts/transcribe.py` com o interpretador indicado
em `WHISPERX_PYTHON_BIN`; se essa variável não estiver definida, usa
`.venv-whisperx/bin/python3` quando esse arquivo existe, e só cai para o
`python3` do PATH global caso contrário. Isso evita o erro comum
`ModuleNotFoundError: No module named 'whisperx'` quando o WhisperX foi
instalado só no venv isolado (recomendado acima) mas o `python3` do PATH
aponta para outro interpretador (ex: Anaconda) sem o pacote.

### Nota sobre o Reddit sem `--input`

O endpoint JSON público (`reddit.com/r/x/top.json`, sem autenticação) é
bloqueado com 403 para tráfego que pareça automatizado, independente da
origem (não é só datacenter/cloud). Por isso `fetchStories` usa
exclusivamente OAuth (`client_credentials`) — não existe hoje um caminho
"sem client_id" funcional para buscar histórias reais no Reddit. Para testar
o pipeline sem esse cadastro, use `--input` (ver [cli.md](./cli.md)).

## Variáveis de ambiente

Referência completa (ver também [`.env.example`](../.env.example)):

| Variável | Obrigatória para | Descrição | Padrão |
|---|---|---|---|
| `REDDIT_CLIENT_ID` | `generate` sem `--input` | Client ID do app Reddit tipo "script" | — |
| `REDDIT_CLIENT_SECRET` | `generate` sem `--input` | Client secret do mesmo app | — |
| `REDDIT_USER_AGENT` | Recomendado sempre | User-Agent enviado ao Reddit | `reddit-story-pipeline/0.1` |
| `ELEVENLABS_API_KEY` | `regenerate:elevenlabs` | Chave de API do ElevenLabs | — |
| `ELEVENLABS_VOICE_ID` | `regenerate:elevenlabs` | ID de voz pt-BR na conta ElevenLabs | — |
| `ELEVENLABS_MONTHLY_CHAR_LIMIT` | Opcional | Teto de caracteres/mês antes do `QuotaTracker` bloquear | `10000` |
| `PIPER_MODEL_PATH` | `generate` e `regenerate:elevenlabs` | Caminho do `.onnx` do modelo Piper | — |
| `PEXELS_API_KEY` | `generate` e `regenerate:elevenlabs` | Chave de API do Pexels | — |
| `WHISPER_MODEL_SIZE` | Opcional | Tamanho do modelo WhisperX (`tiny`/`base`/`small`/...) | `base` |
| `WHISPERX_PYTHON_BIN` | Opcional | Caminho do interpretador Python com WhisperX instalado | `.venv-whisperx/bin/python3` se existir, senão `python3` do PATH |

Variáveis marcadas como obrigatórias fazem os scripts abortarem com
`process.exit(1)` e mensagem clara (`requireEnv`) se ausentes — não há
fallback silencioso.

## Diretórios não versionados relevantes

| Caminho | Conteúdo | Por que fora do git |
|---|---|---|
| `models/` | Modelo de voz Piper (`.onnx`) | Binário grande, baixado separadamente |
| `.venv-whisperx/` | venv Python isolado do WhisperX | Ambiente local, não portável |
| `storage/pending-review/*`, `approved/*`, `published/*`, `discarded/*` | Jobs gerados em runtime | Saída, não código-fonte (`.gitkeep` mantém a estrutura de pastas) |
| `storage/elevenlabs-quota.json` | Estado da cota mensal | Estado local mutável |
| `.env` | Credenciais reais | Segredo |
