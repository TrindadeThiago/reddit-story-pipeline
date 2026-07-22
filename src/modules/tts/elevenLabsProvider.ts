import { writeFile } from "node:fs/promises";
import type { TtsProvider } from "./ttsProvider.js";
import type { NarrationResult } from "../../types.js";
import { QuotaTracker } from "./quotaTracker.js";

/**
 * So deve ser chamado quando o resultado do Piper NAO for satisfatorio
 * (caminho 2 do fluxo de revisao). Controla a cota mensal gratuita
 * (~10k caracteres) para nao estourar sem perceber.
 */
export class ElevenLabsProvider implements TtsProvider {
  readonly name = "elevenlabs" as const;
  readonly fileExtension = "mp3";

  constructor(
    private readonly apiKey: string,
    private readonly voiceId: string,
    private readonly quota: QuotaTracker,
    private readonly apiUrl: string,
    private readonly modelId: string
  ) { }

  async synthesize(text: string, outputPath: string): Promise<NarrationResult> {
    await this.quota.assertHasBudget(text.length); // lanca erro se for estourar a cota do mes

    const response = await fetch(
      `${this.apiUrl}/text-to-speech/${this.voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: this.modelId,
          voice_settings: {
            speed: 1.2
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs falhou: ${response.status} ${await response.text()}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    await writeFile(outputPath, audioBuffer);

    await this.quota.recordUsage(text.length);

    return {
      provider: this.name,
      audioFilePath: outputPath,
      charactersUsed: text.length,
    };
  }
}
