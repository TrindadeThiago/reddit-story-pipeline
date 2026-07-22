# Contrato: Workflow de CI (`.github/workflows/ci.yml`)

## Gatilhos

- `push` em qualquer branch.
- `pull_request` contra `main`.

## Passos mínimos

1. Checkout do repositório.
2. Setup do Node.js na versão mínima declarada em `engines.node` do `package.json` (≥18).
3. Habilitar Corepack e instalar dependências com Yarn (`yarn install --frozen-lockfile`), respeitando o `packageManager` declarado.
4. Rodar `yarn test:coverage` (equivalente a `vitest run --coverage`), que já aplica o threshold de 100% configurado em `vitest.config.ts`.

## Comportamento esperado

- Se qualquer teste falhar, ou se a cobertura ficar abaixo do threshold configurado, o job do workflow termina com status de falha, visível na aba "Checks" do pull request/commit no GitHub.
- Se todos os testes passarem e a cobertura atingir o threshold, o job termina com status de sucesso.
- O workflow não depende de nenhum segredo (chave de API real) — todas as chamadas externas (Reddit, ElevenLabs, Pexels) já são mockadas na suíte de testes existente.

## Fora de escopo (decidido em `/speckit-clarify`)

- Configurar branch protection rules para tornar esse check obrigatório antes de merge é uma ação administrativa do mantenedor no GitHub, feita fora desta feature.
