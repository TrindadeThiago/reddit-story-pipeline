# Quickstart: Módulo TTS — ElevenLabs + controle de cota

Guia para validar as User Stories 1 e 2 do spec.md contra
`src/modules/tts/{elevenLabsProvider,quotaTracker}.ts`.

## Pré-requisitos

- `ELEVENLABS_API_KEY` e `ELEVENLABS_VOICE_ID` válidos configurados
  (fase 001).
- Acesso de rede de saída para `api.elevenlabs.io`.

## Validação — User Story 1 (síntese de qualidade superior)

1. Instanciar `QuotaTracker` com um `statePath` de teste e um
   `monthlyLimit` alto o suficiente para não bloquear.
2. Instanciar `ElevenLabsProvider` com `apiKey`, `voiceId` e o
   `QuotaTracker` acima.
3. Chamar `synthesize(texto, "output-teste.mp3")` com um texto real.
   - **Resultado esperado**: arquivo de áudio válido em português criado
     no caminho informado (cenário 1).
4. Inspecionar o resultado.
   - **Resultado esperado**: `NarrationResult.provider === "elevenlabs"`
     (cenário 2).

## Validação — User Story 2 (controle de cota)

1. Instanciar `QuotaTracker` com `monthlyLimit` baixo (ex: 100
   caracteres) e um `statePath` de teste limpo.
2. Chamar `synthesize` com um texto de mais de 100 caracteres.
   - **Resultado esperado**: a chamada é rejeitada **antes** de qualquer
     requisição de rede à API do ElevenLabs (confirmar, por exemplo,
     interceptando/observando que nenhuma chamada de rede foi feita)
     (cenário 1).
   - **Status atual conhecido**: a implementação atual **NÃO** aguarda
     (`await`) `assertHasBudget`, então a API é chamada mesmo quando
     deveria ser bloqueada (ver `research.md`) — este passo deve falhar
     até a correção ser aplicada na fase de implementação.
3. Editar manualmente o arquivo de estado da cota para simular um mês
   anterior (`yearMonth` de um mês passado) e chamar `synthesize`
   novamente.
   - **Resultado esperado**: a síntese é aceita normalmente, com o
     contador tratado como zerado (cenário 2).
4. Chamar `synthesize` com sucesso, encerrar o processo, iniciar um novo
   processo e chamar `assertHasBudget` de novo com o mesmo `statePath`.
   - **Resultado esperado**: o saldo restante reflete o uso da chamada
     anterior — o estado sobreviveu ao reinício (cenário 3).

## Critério de conclusão da fase

Ambas as validações passam sem intervenção manual além de preparar os
arquivos de estado de teste; nenhuma chamada bloqueada pela cota deve
gastar créditos reais da conta ElevenLabs.
