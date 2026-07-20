# Research: Scripts CLI (os 3 caminhos da revisão)

Sem marcadores `NEEDS CLARIFICATION` no Technical Context. Decisões abaixo
consolidam o que já está implementado nos quatro scripts e o ponto a
reforçar.

## Decisão: Validar variáveis de ambiente obrigatórias antes de rodar (ponto a reforçar)

- **Decision**: No início de cada script que depende de variáveis de
  ambiente obrigatórias (`run-pipeline.ts`:
  `PIPER_MODEL_PATH`, `PEXELS_API_KEY`;
  `regenerate-with-elevenlabs.ts`: `PEXELS_API_KEY`,
  `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`), checar explicitamente que
  cada uma está definida e, se alguma faltar, imprimir uma mensagem
  identificando qual variável está ausente e sair com código de erro,
  antes de qualquer trabalho custoso (busca de histórias, chamadas de
  API) começar.
- **Rationale**: Os scripts atuais usam `process.env.X!` (non-null
  assertion do TypeScript), que não faz nenhuma checagem em runtime — se
  a variável realmente estiver `undefined`, o valor `undefined` é passado
  adiante (ex: para `new PiperProvider(undefined)`), e o erro só aparece
  depois, de forma indireta, dentro de uma chamada mais profunda (ex:
  `piper` falhando por receber `--model undefined`). Isso não é
  tecnicamente um bug que impede o funcionamento no caminho feliz (com
  todas as variáveis configuradas), mas viola o espírito do edge case
  "variável de ambiente obrigatória ausente" descrito no spec — o erro
  atual não identifica a causa raiz de forma direta.
- **Alternatives considered**: Deixar como está — descartado porque o
  padrão de "falhar cedo e claro" já foi aplicado nas fases 02–09 para
  outros tipos de entrada ausente (arquivo, subreddit, vídeo vertical); é
  consistente reforçar o mesmo padrão aqui para configuração ausente.

## Decisão: `npm run publish` encadeando `moveToApproved` + `moveToPublished`

- **Decision**: Manter o encadeamento já implementado — `publish.ts`
  chama `moveToApproved(jobId)` e depois `moveToPublished(jobId)` na
  mesma execução.
- **Rationale**: Atende FR-002 e o critério de aceite original ("não
  quebra se rodado duas vezes seguidas... deve falhar com mensagem clara
  na segunda vez") — a segunda execução falha em `moveToApproved` porque
  o job já não está mais em `pending-review` (foi movido para
  `published` na primeira execução), com o erro `ENOENT` claro já
  validado na fase 09.
- **Alternatives considered**: Expor `approve` e `publish` como comandos
  separados — descartado porque o spec original já define "caminho 1"
  como uma única decisão do humano (publicar), não duas etapas
  distintas.

## Decisão: Regeneração cria um job novo, não sobrescreve o original

- **Decision**: Manter `regenerate-with-elevenlabs.ts` chamando
  `runPipelineForStory(previousJob.story, {...})` (que gera um `jobId`
  novo internamente, fase 08), em vez de reescrever o job original.
- **Rationale**: Atende FR-004/cenário 3 diretamente — o job original
  permanece intocado em `pending-review`, e um novo job aparece para
  revisão rápida, comparando as duas narrações lado a lado se necessário.
- **Alternatives considered**: Sobrescrever o job original com a nova
  narração — descartado porque perderia a possibilidade de comparar
  Piper vs. ElevenLabs antes de decidir, e contraria o critério de
  aceite original ("cria um **novo** job para revisão rápida").

## Decisão: Mensagem de uso para `jobId` ausente

- **Decision**: Manter o padrão já implementado em `publish.ts`,
  `discard.ts` e `regenerate-with-elevenlabs.ts` —
  `if (!jobId) { console.error("Uso: npm run X -- <jobId>"); process.exit(1); }`.
- **Rationale**: Atende FR-005/SC-003 diretamente — já testável e
  consistente nos três scripts.
- **Alternatives considered**: N/A — já é a implementação correta.
