# Quickstart: Orquestrador do Pipeline

Guia para validar as User Stories 1, 2 e 3 do spec.md contra
`src/pipeline.ts`.

## Pré-requisitos

- Todas as fases 02–07 implementadas e validadas individualmente.
- Ambiente completo da fase 001 (ffmpeg, Piper, WhisperX instalados;
  variáveis de ambiente configuradas).
- Uma história real (obtida via `fetchStories`, fase 02).

## Validação — User Story 1 (fluxo ponta a ponta)

1. Chamar `runPipelineForStory(story, deps)` com `deps.ttsProvider` sendo
   um `PiperProvider`.
   - **Resultado esperado**: `PipelineJob` resolvido com `narration`,
     `captions` e `video` preenchidos; pasta
     `storage/pending-review/<jobId>/` existe com todos os artefatos
     (cenário 1).
2. Rodar novamente para a mesma história.
   - **Resultado esperado**: `jobId` diferente da primeira execução
     (cenário 2, SC-004).

## Validação — User Story 2 (troca de provedor)

1. Repetir o passo 1 acima trocando `deps.ttsProvider` para um
   `ElevenLabsProvider` (com `QuotaTracker` configurado).
   - **Resultado esperado**: mesma estrutura de `PipelineJob` resolvida,
     sem nenhuma alteração no código de `pipeline.ts` (cenário 1, SC-002).

## Validação — User Story 3 (erro identifica a etapa)

1. Forçar uma falha na etapa de vídeo de fundo (ex: `pexelsApiKey`
   inválida ou `backgroundQuery` sem resultado).
   - **Resultado esperado**: o erro recebido identifica que a falha
     ocorreu na etapa de busca/download de vídeo de fundo, preservando a
     mensagem original (cenário 1, SC-003).

## Critério de conclusão da fase

Todas as validações passam sem intervenção manual além de fornecer uma
história real e credenciais válidas; nenhuma execução do caminho feliz
falha por causa do vídeo de fundo não estar disponível localmente para a
composição.
