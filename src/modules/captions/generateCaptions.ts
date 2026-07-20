import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import type { CaptionResult, CaptionWord } from "../../types.js";

const execFileAsync = promisify(execFile);

/**
 * Transcreve o audio ja gerado (Piper ou ElevenLabs) usando WhisperX
 * local (whisper + forced alignment via wav2vec2), para extrair timestamp
 * palavra-a-palavra com boa precisao. Nenhum TTS gratuito devolve isso
 * pronto, entao alinhamos por conta propria.
 *
 * Chama um script Python auxiliar (scripts/transcribe.py) via subprocess.
 */
export async function generateCaptions(
  audioFilePath: string,
  outputSrtPath: string,
  modelSize: string
): Promise<CaptionResult> {
  await execFileAsync("python3", [
    "scripts/transcribe.py",
    "--audio",
    audioFilePath,
    "--model",
    modelSize,
    "--out-srt",
    outputSrtPath,
    "--out-json",
    `${outputSrtPath}.words.json`,
  ]);

  const wordsRaw = await readFile(`${outputSrtPath}.words.json`, "utf-8");
  const words = JSON.parse(wordsRaw) as CaptionWord[];

  return { words, srtFilePath: outputSrtPath };
}
