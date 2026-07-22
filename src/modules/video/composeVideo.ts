import { existsSync } from "node:fs";
import { join } from "node:path";
import ffmpeg from "fluent-ffmpeg";
import type { ComposedVideo } from "../../types.js";
import type { FlatClip } from "./localBackgroundProvider.js";

export type BackgroundInput =
  | { kind: "single"; videoPath: string } // ex: Pexels -- um arquivo unico, loopado se mais curto que o audio
  | { kind: "clips"; packDir: string; clips: FlatClip[] }; // ex: pack local -- varios clipes concatenados

interface ComposeOptions {
  narrationAudioPath: string;
  background: BackgroundInput;
  captionsAssPath: string; // legenda .ass com destaque (highlight) por palavra
  outputPath: string; // .mp4 final, formato retrato 1080x1920
}

function backgroundInputPaths(background: BackgroundInput): Array<[string, string]> {
  if (background.kind === "single") {
    return [["backgroundVideoPath", background.videoPath]];
  }
  return background.clips.map((clip, i) => [
    `background.clips[${i}]`,
    join(background.packDir, clip.fileName),
  ]);
}

/**
 * Registra os inputs de video de fundo no comando e retorna os filtros
 * necessarios para produzir um unico stream de video de fundo bruto
 * (antes de escala/crop/legenda), junto com o indice do input de audio
 * da narracao que sera adicionado logo em seguida.
 */
function setupBackgroundInputs(
  command: ReturnType<typeof ffmpeg>,
  background: BackgroundInput
): { extraFilters: string[]; bgLabel: string; narrationInputIndex: number } {
  if (background.kind === "single") {
    command.input(background.videoPath).inputOptions(["-stream_loop -1"]);
    return { extraFilters: [], bgLabel: "[0:v]", narrationInputIndex: 1 };
  }

  const { packDir, clips } = background;
  clips.forEach((clip) => {
    command
      .input(join(packDir, clip.fileName))
      .inputOptions(["-ss", String(clip.startSeconds), "-t", String(clip.durationSeconds)]);
  });

  const trims = clips.map((_, i) => `[${i}:v]setpts=PTS-STARTPTS[v${i}]`);
  const concatInputs = clips.map((_, i) => `[v${i}]`).join("");
  return {
    extraFilters: [...trims, `${concatInputs}concat=n=${clips.length}:v=1:a=0[outv]`],
    bgLabel: "[outv]",
    narrationInputIndex: clips.length,
  };
}

/**
 * Junta video(s) de fundo + narracao + legenda embutida (com destaque de
 * palavra) num UNICO comando ffmpeg: concat dos clipes (quando aplicavel),
 * escala/corte para 1080x1920 e legendas acontecem no mesmo filtergraph,
 * eliminando a recodificacao intermediaria que existia entre montar o
 * fundo local e compor o video final.
 */
export function composeVideo(options: ComposeOptions): Promise<ComposedVideo> {
  if (options.background.kind === "clips" && options.background.clips.length === 0) {
    return Promise.reject(new Error("composeVideo: nenhum clipe de fundo fornecido."));
  }

  const requiredInputs: Array<[string, string]> = [
    ["narrationAudioPath", options.narrationAudioPath],
    ["captionsAssPath", options.captionsAssPath],
    ...backgroundInputPaths(options.background),
  ];
  for (const [field, path] of requiredInputs) {
    if (!existsSync(path)) {
      return Promise.reject(
        new Error(`composeVideo: arquivo de entrada nao encontrado (${field}): ${path}`)
      );
    }
  }

  return new Promise((resolve, reject) => {
    const command = ffmpeg();
    const { extraFilters, bgLabel, narrationInputIndex } = setupBackgroundInputs(
      command,
      options.background
    );
    command.input(options.narrationAudioPath);

    command
      .complexFilter([
        ...extraFilters,
        `${bgLabel}scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg]`,
        `[bg]subtitles=${options.captionsAssPath}[final]`,
      ])
      .map("[final]")
      .outputOptions(["-map", `${narrationInputIndex}:a`, "-shortest", "-c:v libx264", "-c:a aac"])
      .output(options.outputPath)
      .on("end", () => resolve({ videoFilePath: options.outputPath }))
      .on("error", reject)
      .run();
  });
}
