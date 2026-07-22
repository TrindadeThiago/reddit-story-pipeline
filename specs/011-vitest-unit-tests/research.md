# Phase 0 Research: Testes Unitarios com Vitest

## 1. Configuracao do Vitest para ESM + `NodeNext` + imports com extensao `.js`

**Decision**: Instalar `vitest` como devDependency e criar `vitest.config.ts` na raiz com:
- `test.environment: "node"`
- `test.include: ["tests/**/*.test.ts"]` (a suite so roda o que estiver em `tests/`, nunca `src/**/*.test.ts`)
- `test.globals: false` (usar imports explicitos `import { describe, it, expect, vi } from "vitest"`, mantendo consistencia com o estilo explicito ja usado em `fetchStories.test.ts`)
- Nenhuma alteracao necessaria em `tsconfig.json`: o Vitest usa `esbuild` internamente e resolve os imports com extensao `.js` do codigo-fonte (`NodeNext`) sem exigir configuracao adicional, ao contrario do `ts-node`.

**Rationale**: Vitest tem suporte nativo a ESM e a resolucao de modulos do Node moderno, que e exatamente o que o projeto ja usa (`"type": "module"`, `moduleResolution: "NodeNext"`, imports com sufixo `.js` apontando para arquivos `.ts`). Isso elimina a necessidade de loaders customizados que `node:test` ja dispensava, mas que frameworks mais antigos (Jest) exigiriam.

**Alternatives considered**:
- **Manter `node:test` + `tsx --test`**: já funciona hoje para `fetchStories.test.ts`, mas carece de mocking de modulo nativo (`vi.mock`), reporters configuraveis e watch mode — o usuario pediu explicitamente Vitest.
- **Jest**: suporte a ESM ainda experimental/instavel com `NodeNext` + `ts-jest`; exigiria configuracao extra (`extensionsToTreatAsEsm`, `moduleNameMapper` para resolver `.js` → `.ts`) sem beneficio adicional sobre Vitest para este projeto.

## 2. Estrategia de mock para dependencias externas por modulo

**Decision**: Usar `vi.mock`/`vi.spyOn` do proprio Vitest, sem bibliotecas de mock adicionais:
- **`node-fetch` / `fetch` global** (`fetchStories.ts`, `backgroundVideoProvider.ts`, `elevenLabsProvider.ts`): mockar via `vi.stubGlobal("fetch", vi.fn())` ou `vi.mock("node-fetch")`, retornando `Response`-like objects controlados por teste.
- **`fluent-ffmpeg`** (`composeVideo.ts`): mockar o modulo inteiro com `vi.mock("fluent-ffmpeg")`, simulando a cadeia fluente (`.input().output().on().run()`) com um builder falso que invoca os callbacks de evento (`end`, `error`) sincronamente/via `Promise`.
- **`child_process` (Piper binario)** (`piperProvider.ts`): mockar `child_process.spawn`/`exec` para simular stdout/stderr e codigo de saida sem invocar o binario real.
- **Sistema de arquivos** (`reviewQueue.ts`, `backgroundPackIndexer.ts`, `localBackgroundProvider.ts`, `download-background-pack.ts`, `index-background-pack.ts`, scripts CLI): usar um diretorio temporario real (`fs.mkdtempSync` + `os.tmpdir()`) por teste em vez de mockar `fs` inteiro, quando a logica testada e primariamente sobre estrutura de diretorios/arquivos — mais simples e menos fragil que mockar `node:fs` chamada a chamada; usar `vi.mock("node:fs")` apenas onde criar arquivos reais for custoso ou indesejado (ex.: simular arquivos de video grandes).

**Rationale**: Atende FR-009/FR-010 (suite deterministica, sem rede/binarios reais) usando exclusivamente as capacidades de mocking ja embutidas no Vitest, sem novas dependencias de teste alem do proprio framework — alinhado ao Principio III (Simplicidade Deliberada) da constituicao.

**Alternatives considered**:
- **`nock`/`msw` para mock de HTTP**: adicionaria uma dependencia externa so para interceptar `fetch`; `vi.fn()`/`vi.stubGlobal` ja resolvem o caso de uso (poucos endpoints, chamadas simples) sem dependencia extra.
- **`memfs` para mock de filesystem completo**: util para arvores de arquivo grandes/complexas, mas para o volume de arquivos deste projeto (fila de revisao com poucos arquivos por job) o diretorio temporario real e mais simples e mais fiel ao comportamento real do SO.

## 3. Migracao dos testes existentes de `fetchStories`

**Decision**: Converter `src/modules/reddit/fetchStories.test.ts` e `src/modules/reddit/fetchStories.missing-credentials.test.ts` de `node:test`/`node:assert` para Vitest (`describe`/`it`/`expect`), preservando os mesmos casos de teste, e move-los para `tests/modules/reddit/`. O mock de `fetch` ja usado nesses arquivos e re-implementado com `vi.fn()`/`vi.stubGlobal`.

**Rationale**: Atende FR-008 diretamente; evita perda de cobertura ja existente durante a migracao de framework.

**Alternatives considered**: Manter os dois arquivos em `node:test` rodando em paralelo ao Vitest — rejeitado por introduzir dois executores de teste simultaneos no projeto, contrariando FR-002 (comando de teste unico via Vitest) e o Principio III.

## 4. Escopo de teste para `src/scripts/*.ts` e `src/pipeline.ts`

**Decision**: Tratar os scripts CLI e `pipeline.ts` como orquestradores finos: os testes mockam os modulos que eles importam (`reviewQueue`, providers de TTS/video, `fetchStories`) e verificam que a orquestracao (ordem de chamadas, tratamento de erro por unidade de trabalho conforme Principio IV, argumentos de CLI) esta correta — sem exercitar a logica interna dos modulos importados (que ja tem testes proprios).

**Rationale**: Evita duplicar cobertura (a logica de `reviewQueue`/providers ja e testada nos proprios arquivos) e mantém os testes de scripts rapidos e focados na orquestracao, que e onde regressoes de integracao tendem a aparecer (ex.: parametro de CLI parado de ser passado adiante).

**Alternatives considered**: Testes de integracao ponta-a-ponta rodando o binario real via `child_process.exec` — rejeitado para esta feature por depender de ffmpeg/Piper reais, violando FR-009/FR-010; permanece como validacao manual documentada em `docs/testing.md`, conforme ja estabelecido na constituicao para modulos que dependem de binarios externos.

## 5. Configuracao de cobertura com threshold de 100%

**Decision**: Instalar `@vitest/coverage-v8` como devDependency e configurar em `vitest.config.ts`:
- `test.coverage.provider: "v8"`
- `test.coverage.include: ["src/**/*.ts"]` com `exclude` explicito para `src/types.ts`, todo `src/**/index.ts` e `src/modules/tts/ttsProvider.ts` (os mesmos arquivos excluidos do escopo de teste, para que o denominador do calculo de cobertura corresponda exatamente ao conjunto de arquivos elegiveis)
- `test.coverage.thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 }` (Vitest falha o comando com codigo de saida != 0 se qualquer metrica ficar abaixo do valor configurado)
- `test.coverage.reporter: ["text", "html"]` (resumo no terminal + relatorio navegavel em `coverage/index.html` para localizar linhas/branches nao cobertas, atendendo FR-014)
- Script `package.json`: `"test:coverage": "vitest run --coverage"` (roda uma vez, sem watch mode, apropriado para uso local e CI)

**Rationale**: `@vitest/coverage-v8` e a integracao de cobertura oficial do Vitest (usa o coverage nativo do V8/Node, sem instrumentacao de codigo via Babel), o que evita mais uma dependencia de build e mantem os mapas de fonte corretos para arquivos TypeScript transformados por `esbuild`. Configurar `thresholds` diretamente no Vitest evita a necessidade de um script wrapper separado para verificar o percentual e decidir o exit code.

**Alternatives considered**:
- **`c8` standalone**: e o que `@vitest/coverage-v8` usa por baixo, mas integrar diretamente exigiria configuracao manual de mapeamento de source maps e um passo extra fora do Vitest — sem beneficio sobre a integracao oficial.
- **`istanbul` provider (`@vitest/coverage-istanbul`)**: alternativa suportada pelo Vitest, mas exige instrumentacao do codigo (mais lento) e nao tem vantagem para este projeto pequeno; V8 e mais rapido e e o padrao recomendado pelo proprio Vitest para projetos Node.
- **Checar percentual manualmente com um script custom apos `vitest run --coverage --coverage.reporter=json-summary`**: adicionaria complexidade (parsing de JSON, script extra) sem necessidade, já que `thresholds` no proprio Vitest resolve o requisito (FR-013) nativamente.

## Resumo de unknowns resolvidos

Nenhum `NEEDS CLARIFICATION` restou no Technical Context do `plan.md` apos esta pesquisa.
