# Data Model: Scripts CLI (os 3 caminhos da revisão)

Esta fase não introduz entidades novas — apenas invoca módulos das fases
anteriores. As "entidades" são os requisitos de configuração de cada
script.

## Variáveis de ambiente obrigatórias por script

| Script | Variáveis obrigatórias |
|---|---|
| `run-pipeline.ts` (`npm run generate`) | `PIPER_MODEL_PATH`, `PEXELS_API_KEY` |
| `publish.ts` (`npm run publish`) | nenhuma (só opera sobre pastas) |
| `discard.ts` (`npm run discard`) | nenhuma (só opera sobre pastas) |
| `regenerate-with-elevenlabs.ts` (`npm run regenerate:elevenlabs`) | `PEXELS_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` |

## Argumento de linha de comando

| Script | Argumento (`process.argv[2]`) | Obrigatório |
|---|---|---|
| `run-pipeline.ts` | nenhum | — |
| `publish.ts` | `jobId` | Sim (FR-005) |
| `discard.ts` | `jobId` | Sim (FR-005) |
| `regenerate-with-elevenlabs.ts` | `jobId` | Sim (FR-005) |
