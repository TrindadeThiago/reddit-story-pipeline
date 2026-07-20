import { existsSync } from "node:fs";
import ffmpeg from "fluent-ffmpeg";
import type { ComposedVideo } from "../../types.js";

interface ComposeOptions {
  narrationAudioPath: string;
  backgroundVideoPath: string;
  srtCaptionsPath: string;
  outputPath: string; // .mp4 final, formato retrato 1080x1920
}

/**
 * Junta narracao + video de fundo (cortado/loopado para bater com a duracao
 * do audio) + legenda embutida, exportando em 1080x1920 (retrato).
 */
export function composeVideo(options: ComposeOptions): Promise<ComposedVideo> {
  const requiredInputs: Array<[string, string]> = [
    ["narrationAudioPath", options.narrationAudioPath],
    ["backgroundVideoPath", options.backgroundVideoPath],
    ["srtCaptionsPath", options.srtCaptionsPath],
  ];
  for (const [field, path] of requiredInputs) {
    if (!existsSync(path)) {
      return Promise.reject(
        new Error(`composeVideo: arquivo de entrada nao encontrado (${field}): ${path}`)
      );
    }
  }

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(options.backgroundVideoPath)
      .inputOptions(["-stream_loop -1"]) // loopa o video de fundo se for mais curto que o audio
      .input(options.narrationAudioPath)
      .complexFilter([
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg]",
        `[bg]subtitles=${options.srtCaptionsPath}[final]`,
      ])
      .map("[final]")
      .outputOptions(["-map", "1:a", "-shortest", "-c:v libx264", "-c:a aac"])
      .output(options.outputPath)
      .on("end", () =>
        resolve({ videoFilePath: options.outputPath })
      )
      .on("error", reject)
      .run();
  });
}
