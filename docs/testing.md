# Testes

## Como rodar

```bash
npm test
```

Executa `tsx --test src/**/*.test.ts` — usa o test runner nativo do Node
(`node:test` + `node:assert/strict`), sem framework externo (nenhum
Jest/Vitest no projeto).

## Cobertura atual

Hoje só `src/modules/reddit/fetchStories.test.ts` tem testes automatizados:

1. **"fetchStories usa OAuth (access_token + Bearer) e filtra por
   score/tamanho"** — mocka `global.fetch`, intercepta tanto a chamada de
   token (`reddit.com/api/v1/access_token`) quanto a de dados
   (`oauth.reddit.com/r/AskHistorians/top`), e confirma:
   - o header `Authorization: Basic <base64(client_id:client_secret)>` na chamada de token;
   - o header `Authorization: Bearer <token>` na chamada de dados;
   - que um post abaixo de `minBodyLength` é filtrado fora do resultado.
2. **"fetchStories reporta erro claro se faltarem credenciais"** — roda sem
   `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET`, confirma que a função devolve
   `[]` (não lança) e que a mensagem de erro logada menciona as variáveis
   ausentes.

Os demais módulos (`piperProvider`, `elevenLabsProvider`, `quotaTracker`,
`generateCaptions`, `buildHighlightedAss`, `backgroundVideoProvider`,
`composeVideo`, `reviewQueue`, `pipeline`) não têm testes automatizados no
repositório — foram validados manualmente durante o desenvolvimento (ver
checklist abaixo), mas não há um regression test que rode em CI.

### Padrão usado no teste existente (para novos testes)

- Mock de rede via substituição direta de `global.fetch` (sem biblioteca de mock), restaurado em `finally`.
- Reimport do módulo sob teste com um query string único (`?t=${Date.now()}`) a cada teste, para resetar caches em memória no nível do módulo (aqui, o `tokenCache` de `fetchStories`).
- Captura de `console.error` substituindo a função global temporariamente, para asserir sobre mensagens de log sem poluir a saída do test runner.

## Validação com dependências reais

Como o pipeline depende de binários/serviços externos pesados (ffmpeg,
Piper, WhisperX, Reddit, Pexels, ElevenLabs), grande parte da validação
"ponta a ponta" não é coberta por testes automatizados — é feita manualmente
numa máquina com tudo instalado e credenciais reais.

Resumo do que já foi confirmado dessa forma:

- Setup (ffmpeg, Piper, WhisperX instalados e importáveis) ✓
- Síntese real com Piper (2130 caracteres → áudio pt-BR válido) ✓
- Isolamento de falha por subreddit/etapa (com mocks) ✓
- Ciclo completo da fila de revisão (pending → approved → published / discarded) ✓
- Bloqueio de cota do ElevenLabs antes de chamar a API (com `fetch` interceptado) ✓

E o que ainda depende de confirmação numa máquina real:

- Busca real no Reddit (bloqueada por 403 na máquina de desenvolvimento — ver [environment.md](./environment.md#nota-sobre-o-reddit-sem---input))
- Síntese real com ElevenLabs (credenciais reais)
- Transcrição real completa via WhisperX (bloqueada por OOM na máquina de desenvolvimento, 3.8GB RAM — ver [environment.md](./environment.md#nota-sobre-ram-e-whisperx`))
- Composição de vídeo ponta a ponta com todos os artefatos reais
- Os quatro comandos CLI (`generate`, `publish`, `discard`, `regenerate:elevenlabs`) com ambiente completo

A legenda com highlight de palavra ([captions-highlight.md](./captions-highlight.md))
foi validada nesse mesmo espírito: gerando um job real e extraindo um frame
com `ffmpeg -ss ... -frames:v 1` para inspeção visual, em vez de um teste
automatizado (não há assertion prática para "a cor certa está no pixel
certo" sem um framework de comparação de imagem, que não existe hoje no
projeto).
