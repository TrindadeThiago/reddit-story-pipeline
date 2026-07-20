# Contract: TtsProvider

Interface exposta pelo módulo TTS para o restante do pipeline
(orquestrador fase 08). **Fixa** — a fase 04 (`ElevenLabsProvider`) e o
orquestrador dependem dela não mudar.

```ts
interface TtsProvider {
  readonly name: "piper" | "elevenlabs";
  synthesize(text: string, outputPath: string): Promise<NarrationResult>;
}
```

## Comportamento esperado (qualquer implementação)

- `synthesize` resolve com um `NarrationResult` cujo `provider` é igual a
  `name`.
- Após a promise resolver, um arquivo de áudio válido existe em
  `outputPath`.
- O áudio cobre o texto completo recebido em `text`, sem truncar.

## Implementação: PiperProvider

```ts
class PiperProvider implements TtsProvider {
  readonly name = "piper";
  constructor(modelPath: string);
  synthesize(text: string, outputPath: string): Promise<NarrationResult>;
}
```

| Cenário | Comportamento esperado |
|---|---|
| Texto válido, caminho de saída gravável | Resolve com `NarrationResult` e arquivo de áudio pt-BR válido em `outputPath` |
| Caminho de saída não gravável (permissão, diretório inexistente) | Rejeita com erro identificável — não falha silenciosamente |
| Texto longo (2000+ caracteres) | Áudio cobre o texto inteiro (FR-003) |
