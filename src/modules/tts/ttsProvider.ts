import type { NarrationResult } from "../../types.js";

/**
 * Contrato unico que Piper e ElevenLabs implementam.
 * O restante do pipeline (legendas, montagem de video) nao sabe
 * -- nem precisa saber -- qual provider gerou o audio.
 */
export interface TtsProvider {
  readonly name: NarrationResult["provider"];
  readonly fileExtension: string; // ex: "wav" (Piper), "mp3" (ElevenLabs) -- sem ponto
  synthesize(text: string, outputPath: string): Promise<NarrationResult>;
}
