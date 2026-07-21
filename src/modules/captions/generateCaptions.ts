import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { CaptionResult, CaptionWord } from "../../types.js";
import { buildHighlightedAss } from "./buildHighlightedAss.js";

const execFileAsync = promisify(execFile);

// WhisperX normalmente e instalado num venv isolado (ver docs/environment.md)
// para nao poluir o Python global da maquina -- por isso preferimos o
// interpretador do venv, se existir, em vez do "python3" do PATH.
const DEFAULT_VENV_PYTHON = ".venv-whisperx/bin/python3";

function resolvePythonBin(): string {
  if (process.env.WHISPERX_PYTHON_BIN) {
    return process.env.WHISPERX_PYTHON_BIN;
  }
  return existsSync(DEFAULT_VENV_PYTHON) ? DEFAULT_VENV_PYTHON : "python3";
}

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
  await execFileAsync(resolvePythonBin(), [
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

  const assFilePath = outputSrtPath.replace(/\.srt$/, ".ass");
  await buildHighlightedAss(words, assFilePath);

  return { words, srtFilePath: outputSrtPath, assFilePath };
}
