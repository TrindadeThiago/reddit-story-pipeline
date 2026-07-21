import { readFile } from "node:fs/promises";
import { join } from "node:path";
import ffmpeg from "fluent-ffmpeg";
import type { BackgroundPackIndex } from "../../types.js";

interface FlatClip {
  fileName: string;
  startSeconds: number;
  durationSeconds: number;
}

const DURATION_BUFFER_SECONDS = 2; // margem para nao ficar curto por arredondamento de encode

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function flattenClips(index: BackgroundPackIndex): FlatClip[] {
  return index.files.flatMap((file) =>
    file.clips.map((clip) => ({
      fileName: file.fileName,
      startSeconds: clip.startSeconds,
      durationSeconds: clip.endSeconds - clip.startSeconds,
    }))
  );
}

/**
 * Sorteia clipes (trechos curtos ja identificados pelo indexador de cenas)
 * ate somar pelo menos targetDurationSeconds. Se o pack inteiro nao for
 * suficiente, reembaralha e permite repetir clipes.
 */
function pickClips(index: BackgroundPackIndex, targetDurationSeconds: number): FlatClip[] {
  const allClips = flattenClips(index);
  if (allClips.length === 0) {
    throw new Error("Pack de videos de fundo nao tem nenhum clipe indexado.");
  }

  const selected: FlatClip[] = [];
  let total = 0;
  while (total < targetDurationSeconds + DURATION_BUFFER_SECONDS) {
    for (const clip of shuffle(allClips)) {
      selected.push(clip);
      total += clip.durationSeconds;
      if (total >= targetDurationSeconds + DURATION_BUFFER_SECONDS) {
        break;
      }
    }
  }

  return selected;
}

function assembleClips(
  packDir: string,
  clips: FlatClip[],
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    clips.forEach((clip) => {
      command
        .input(join(packDir, clip.fileName))
        .inputOptions(["-ss", String(clip.startSeconds), "-t", String(clip.durationSeconds)]);
    });

    const trims = clips.map((_, i) => `[${i}:v]setpts=PTS-STARTPTS[v${i}]`);
    const concatInputs = clips.map((_, i) => `[v${i}]`).join("");
    const filterComplex = [...trims, `${concatInputs}concat=n=${clips.length}:v=1:a=0[outv]`];

    command
      .complexFilter(filterComplex)
      .map("[outv]")
      .outputOptions(["-c:v libx264", "-an"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

/**
 * Monta um video de fundo local juntando clipes inteiros (sem cortar no meio
 * de uma cena) do pack indexado por `index:background-pack`, a partir dos
 * trechos curtos ja identificados pelo indexador de cenas.
 */
export async function buildLocalBackgroundVideo(
  packDir: string,
  indexPath: string,
  targetDurationSeconds: number,
  outputPath: string
): Promise<void> {
  const raw = await readFile(indexPath, "utf-8");
  const index = JSON.parse(raw) as BackgroundPackIndex;

  const clips = pickClips(index, targetDurationSeconds);
  await assembleClips(packDir, clips, outputPath);
}
