# 11 — Publicação nas Plataformas (Backlog)

> Esta fase está deliberadamente fora do escopo da implementação atual.
> Documentada aqui só para não se perder como próximo passo natural depois
> que as fases 01–10 estiverem validadas manualmente por um tempo.

## Objetivo (futuro)
Substituir o "TODO: acionar upload via API da plataforma desejada" do
`publish.ts` (fase 10) por upload automático para Instagram, TikTok e/ou
YouTube Shorts.

## Motivo de ficar de fora agora
- Cada plataforma exige processo próprio de aprovação de app/API
  (Instagram/TikTok em particular têm revisão de app bem mais burocrática
  que gerar vídeo).
- O fluxo atual já cobre a necessidade real definida: gerar + revisar
  manualmente. O upload em si pode continuar manual (você mesmo sobe o
  `.mp4` de `storage/published`) até valer a pena automatizar.

## Pontos a decidir quando esta fase for priorizada
- Publicar nas 3 plataformas ao mesmo tempo ou por etapas (validar uma
  antes de integrar a próxima)?
- Quem preenche legenda/hashtags do post — outro passo do pipeline (LLM
  gerando a partir do título da história) ou preenchido manualmente
  também?
- Agendamento (postar direto vs. agendar horário) — cada plataforma tem
  suporte diferente pra isso via API.
