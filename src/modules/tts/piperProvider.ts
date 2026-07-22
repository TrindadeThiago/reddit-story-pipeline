import { spawn } from "node:child_process";
import type { TtsProvider } from "./ttsProvider.js";
import type { NarrationResult } from "../../types.js";

/**
 * Roda o binario/modelo Piper localmente. Sem custo, sem limite de cota.
 * E o caminho padrao do pipeline (etapa 1 do fluxo hibrido).
 */
export class PiperProvider implements TtsProvider {
  readonly name = "piper" as const;
  readonly fileExtension = "wav"; // piper sempre gera WAV, independente da extensao do outputPath

  constructor(
    private readonly modelPath: string,
    private readonly lengthScale: string
  ) {}

  async synthesize(text: string, outputPath: string): Promise<NarrationResult> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("piper", [
        "--model",
        this.modelPath,
        "--length_scale",
        this.lengthScale,
        "--output_file",
        outputPath,
      ]);

      let stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(`piper saiu com codigo ${code}${stderr ? `: ${stderr}` : ""}`)
          );
        }
      });

      child.stdin.write(text);
      child.stdin.end();
    });

    return {
      provider: this.name,
      audioFilePath: outputPath,
      charactersUsed: text.length, // nao conta para nenhuma cota, mas mantemos p/ metricas
    };
  }
}
