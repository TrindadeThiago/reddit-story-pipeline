# Quickstart: Validar as Melhorias Recomendadas

Guia para validar manualmente, de ponta a ponta, que cada user story da feature funciona depois da implementação. Assume o ambiente já configurado conforme `docs/environment.md` (ffmpeg, Piper, WhisperX, `.env`).

## Pré-requisitos

```bash
corepack enable
yarn install --frozen-lockfile
npx tsc --noEmit
yarn test:coverage
```

Todos os passos abaixo devem passar antes de prosseguir.

## US1 — Sanitização de `jobId`/`story.id`

```bash
# 1. História manual com id malicioso deve ser rejeitada antes de qualquer escrita
cat > /tmp/malicious-story.json <<'EOF'
[{"id": "../../tmp/evil", "title": "teste", "body": "corpo de teste"}]
EOF
yarn generate -- --input /tmp/malicious-story.json
# Esperado: processo encerra com erro claro sobre jobId/id inválido, nenhum arquivo criado fora de storage/

# 2. Comando publish/discard com jobId malicioso via argv deve ser rejeitado
yarn discard -- "../../etc/passwd"
# Esperado: erro imediato, nenhum rename executado (verificar com `git status` / `ls storage/` que nada mudou)
```

## US2 — Cota do ElevenLabs

```bash
# Limite inválido deve impedir qualquer chamada paga
ELEVENLABS_MONTHLY_CHAR_LIMIT="" yarn regenerate:elevenlabs -- <jobId-existente>
# Esperado: falha imediata na inicialização do QuotaTracker, nenhuma requisição HTTP ao ElevenLabs
```

Verificar (ex.: com um proxy/log de rede local, ou inspecionando que `storage/elevenlabs-quota.json` não foi alterado) que nenhuma chamada de rede ocorreu.

## US3 — Composição de vídeo em um passo

```bash
time yarn generate -- --input tests/fixtures/... # usar uma história de referência pequena
```

Comparar o tempo total contra uma execução da branch `main` (antes da mudança) para o mesmo input — esperado ao menos 30% de redução (SC-003). Verificar visualmente `storage/pending-review/<jobId>/final.mp4`: proporção 1080x1920, áudio sincronizado, legendas com destaque palavra-a-palavra presentes.

## US4 — Higiene de dependências

```bash
git ls-files | grep -E "package-lock.json|yarn.lock"
# Esperado: apenas yarn.lock

grep -r "node-fetch" src/ || echo "OK: node-fetch não é mais importado"

node -e "console.log(require('./package.json').engines)"
# Esperado: { node: '>=18' }
```

## US5 — CI

```bash
git push origin 012-melhorias-recomendadas
gh pr create --fill
gh pr checks --watch
```

Esperado: o check do workflow `ci.yml` aparece e reporta pass/fail com base em `yarn test:coverage`.

## US6 — Erros explícitos

```bash
# História manual sem campo obrigatório
cat > /tmp/incomplete-story.json <<'EOF'
[{"id": "abc123", "title": "teste"}]
EOF
yarn generate -- --input /tmp/incomplete-story.json
# Esperado: erro imediato citando o campo "body" ausente, antes de qualquer chamada ao TTS

# Falha de autenticação do Reddit (simular removendo/invalidando as credenciais OAuth no .env)
yarn generate -- --subreddits AmItheAsshole
# Esperado com credenciais inválidas: processo encerra com erro de autenticação explícito,
# NÃO deve imprimir "Encontradas 0 historias" como se tivesse tido sucesso.
```

## Regressão geral

```bash
npx tsc --noEmit
yarn test:coverage
```

Ambos devem passar com 100% de cobertura antes de considerar a feature concluída (Fluxo de Desenvolvimento e Qualidade da constituição).
