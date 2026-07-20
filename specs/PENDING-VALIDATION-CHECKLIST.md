# Checklist de Validação Pendente (rodar numa máquina real)

Consolida todas as tasks que ficaram bloqueadas no sandbox de
desenvolvimento (sem ffmpeg/Piper/WhisperX instalados, sem rede liberada
para `reddit.com`/`api.pexels.com`, sem credenciais reais do
ElevenLabs). Nenhum item aqui é lógica não implementada — todo o código
já foi corrigido e validado isoladamente (mocks, binários fake,
interceptação de `fetch`); o que falta é confirmar o caminho feliz com
dependências reais.

Marque cada item ao validar. Se algo falhar, o `tasks.md` da fase
correspondente tem o contexto completo (o que foi corrigido, o que já
foi testado, critérios de aceite).

## 0. Pré-requisitos (uma vez só)

- [X] `ffmpeg -version` roda sem erro, com suporte a `libx264` e ao filtro `subtitles` — já estava instalado nesta máquina
- [X] `piper --help` roda sem erro; modelo de voz pt-BR baixado e `PIPER_MODEL_PATH` apontando pra ele — instalado em `~/.local/bin/piper` + `~/.local/share/piper/`; modelo `pt_BR-faber-medium` baixado em `models/piper/`
- [X] `python3 -c "import whisperx"` roda sem erro — instalado num venv isolado `.venv-whisperx/` (não afeta o Python global da máquina); `import whisperx` confirmado
  - ⚠️ **Achado**: esta máquina tem só 3.8GB de RAM. Rodar uma transcrição real (whisper + pyannote VAD + wav2vec2 alignment, tudo em `torch`) **estourou a memória 3 vezes seguidas** (processo morto pelo OOM killer do kernel, swap de 1GB também esgotado). O `import` funciona e a instalação está correta — o problema é RAM insuficiente para rodar o modelo, não a instalação. Se a fase 4 abaixo (legendas) continuar falhando por OOM, considere: fechar outros processos pesados (VS Code Server, extensões) antes de rodar, usar `--model tiny` em vez de `base`, ou rodar numa máquina/VM com mais memória.
- [ ] `.env` preenchido com credenciais reais: `PEXELS_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `REDDIT_USER_AGENT`
- [ ] Rede de saída liberada para `reddit.com`, `api.pexels.com`, `api.elevenlabs.io` — `reddit.com` retornou HTTP 403 quando testado a partir desta máquina (bloqueio de rede ou anti-bot do Reddit); os demais não foram testados ainda

Referência: `specs/001-setup-projeto/tasks.md` (T014 ✓, T016 ✓)

## 1. Módulo Reddit (fase 002)

- [ ] Buscar 2–3 subreddits reais (ex: `AskHistorians`) com `fetchStories` e confirmar histórias filtradas por score/tamanho retornando corretamente

Referência: `specs/002-modulo-reddit/tasks.md` (T006, T010) · `specs/002-modulo-reddit/quickstart.md`

## 2. TTS Piper (fase 003)

- [X] Sintetizar um texto real de história (2000+ caracteres) com `PiperProvider` e confirmar áudio pt-BR válido e completo — **validado**: 2130 caracteres → 119,7s de áudio `.wav` válido (22050 Hz mono). Recomendo ouvir o arquivo para checar qualidade da voz subjetivamente (isso eu não consigo avaliar).

Referência: `specs/003-modulo-tts-piper/tasks.md` (T006 ✓, T010 ✓) · `specs/003-modulo-tts-piper/quickstart.md`

## 3. TTS ElevenLabs (fase 004)

- [ ] Sintetizar um texto real com `ElevenLabsProvider` (credenciais reais) e confirmar áudio pt-BR válido
- ⚠️ Controle de cota já 100% validado (bloqueio antes da chamada à API confirmado com `fetch` interceptado) — este passo só confirma a síntese em si

Referência: `specs/004-modulo-tts-elevenlabs/tasks.md` (T010, T011) · `specs/004-modulo-tts-elevenlabs/quickstart.md`

## 4. Legendas WhisperX (fase 005)

- [ ] Transcrever um áudio real (gerado no passo 2 ou 3) e confirmar `.srt` válido (abre em player) + `.words.json` com timestamps
  - ⚠️ **Tentado e não concluído por falta de RAM** (ver seção 0): rodei `python scripts/transcribe.py --model base --language pt` sobre um áudio real de 120s gerado pelo Piper, dentro do venv `.venv-whisperx/`. O processo foi morto pelo OOM killer 3 vezes seguidas (memória total da máquina: 3.8GB, insuficiente com o resto do ambiente já em uso). Para rodar: `source .venv-whisperx/bin/activate && python scripts/transcribe.py --audio <audio> --model tiny --language pt --out-srt out.srt --out-json out.words.json` — tente `--model tiny` (bem mais leve que `base`) e feche o VS Code Server/outras extensões pesadas antes.
- [ ] Testar com um áudio contendo ruído/silêncio e confirmar que o processo completa, descartando só as palavras problemáticas

Referência: `specs/005-modulo-legendas/tasks.md` (T006, T008, T009) · `specs/005-modulo-legendas/quickstart.md`

## 5. Vídeo de fundo Pexels (fase 006)

- [ ] Buscar 2–3 queries reais (ex: "pessoa organizando mesa") com `findBackgroundVideo` e confirmar vídeo vertical de maior resolução retornado

Referência: `specs/006-modulo-video-fundo/tasks.md` (T005, T009) · `specs/006-modulo-video-fundo/quickstart.md`

## 6. Composição de vídeo ffmpeg (fase 007)

- [ ] Rodar `composeVideo` ponta a ponta com áudio real (passo 2/3), vídeo de fundo real (passo 5) e legenda real (passo 4) — confirmar formato 1080x1920, duração igual à narração, legenda sincronizada, sem dessincronia perceptível

Referência: `specs/007-modulo-composicao-video/tasks.md` (T006, T009) · `specs/007-modulo-composicao-video/quickstart.md`

## 7. Orquestrador (fase 008)

- [ ] Rodar `runPipelineForStory` com uma história real e `PiperProvider` — confirmar `PipelineJob` completo (incluindo `background.mp4` baixado localmente) e pasta enfileirada em `storage/pending-review/`
- [ ] Repetir trocando `deps.ttsProvider` para `ElevenLabsProvider` e confirmar mesma estrutura de resultado
- [ ] Forçar uma falha real na etapa de vídeo de fundo (ex: `backgroundQuery` sem resultado) e confirmar que o erro identifica a etapa "vídeo de fundo"

Referência: `specs/008-orquestrador-pipeline/tasks.md` (T006, T009, T012, T013) · `specs/008-orquestrador-pipeline/quickstart.md`

## 8. Scripts CLI (fase 010)

- [ ] `npm run generate` com ambiente completo — confirmar uma pasta por história processada
- [ ] `npm run publish -- <jobId>` sobre um job pendente real — confirmar pasta movida pra `storage/published/`
- [ ] `npm run discard -- <jobId>` sobre outro job pendente — confirmar pasta movida pra `storage/discarded/`
- [ ] `npm run regenerate:elevenlabs -- <jobId>` sobre um terceiro job pendente — confirmar novo job criado, original intocado

Referência: `specs/010-scripts-cli/tasks.md` (T004, T006–T008, T013) · `specs/010-scripts-cli/quickstart.md`

---

## Não bloqueado — já 100% validado

- **Fase 001** (Setup): `npm install` + `npx tsc --noEmit` ✓ + ffmpeg/Piper/WhisperX confirmados nesta máquina ✓
- **Fase 002** (Reddit): isolamento de falha por subreddit ✓
- **Fase 003** (TTS Piper): **100% — síntese real validada** (Piper real + modelo pt-BR, 2130 caracteres → áudio válido) ✓
- **Fase 004** (TTS ElevenLabs): bloqueio de cota antes da API ✓ (fetch interceptado)
- **Fase 005** (Legendas): formatação de timestamp SRT ✓ (testado isoladamente) — transcrição real tentada, bloqueada por RAM insuficiente (ver acima)
- **Fase 006** (Vídeo de fundo): filtro/ordenação + erros claros ✓ (fetch mockado)
- **Fase 007** (Composição): checagem de arquivos ausentes ✓
- **Fase 008** (Orquestrador): correção crítica (download local) + contexto de erro por etapa ✓
- **Fase 009** (Fila de revisão): ciclo completo ✓ **100%, nenhuma pendência**
- **Fase 010** (Scripts CLI): validação de env vars + mensagens de uso/erro ✓

## Instalações feitas nesta sessão (persistem nesta máquina)

- **ffmpeg**: já estava instalado (sistema)
- **Piper**: binário em `~/.local/bin/piper` (symlink) + libs em `~/.local/share/piper/`; modelo de voz em `models/piper/pt_BR-faber-medium.onnx` (+ `.json`), já gitignorado
- **WhisperX**: venv isolado em `.venv-whisperx/` na raiz do projeto (não versionado — considere adicionar ao `.gitignore` se ainda não estiver); ativar com `source .venv-whisperx/bin/activate` antes de rodar `scripts/transcribe.py`
