# 00 — Visão Geral

## Objetivo do projeto
Pipeline que busca histórias em fóruns de história do Reddit, gera narração
em áudio (TTS híbrido Piper/ElevenLabs), gera legenda sincronizada
(WhisperX), monta um vídeo vertical (fundo + narração + legenda), e
disponibiliza para revisão manual antes de publicar.

## Como usar estas specs
Cada arquivo `NN-nome.md` é uma fase isolada e implementável de forma
independente, seguindo Spec-Driven Development:
1. Leia o spec da fase.
2. Implemente (ou peça implementação) só do que está no "Escopo".
3. Valide contra os "Critérios de aceite" antes de seguir pra próxima fase.
4. Não implemente nada listado em "Fora de escopo" — isso pertence a uma
   fase futura e entra em outro spec.

## Ordem recomendada das fases

| # | Fase | Depende de |
|---|------|------------|
| 01 | Setup do projeto | — |
| 02 | Módulo Reddit (busca de histórias) | 01 |
| 03 | Módulo TTS — Piper | 01 |
| 04 | Módulo TTS — ElevenLabs + controle de cota | 03 |
| 05 | Módulo de legendas (WhisperX) | 01 |
| 06 | Módulo de vídeo de fundo (Pexels) | 01 |
| 07 | Módulo de composição de vídeo (ffmpeg) | 03, 05, 06 |
| 08 | Orquestrador do pipeline | 02, 03, 05, 06, 07 |
| 09 | Fila de revisão manual | 08 |
| 10 | Scripts CLI (publish/discard/regenerate) | 04, 09 |
| 11 | Publicação real nas plataformas (backlog) | 10 |

Fases 02, 03, 05 e 06 são independentes entre si e podem ser feitas em
qualquer ordem (ou em paralelo). 04 só depende de 03 porque reaproveita a
mesma interface `TtsProvider`.

## Convenções usadas em todas as specs
- **Contrato de interface**: assinatura de função/tipo que a fase deve
  expor — é o que as fases seguintes vão importar. Não deve mudar sem
  atualizar as specs dependentes.
- **Critérios de aceite**: lista verificável (roda / não roda, gera arquivo
  X, lança erro em condição Y). Servem de checklist antes de dar a fase
  como concluída.
