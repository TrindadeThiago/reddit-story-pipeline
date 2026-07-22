import { readFile } from "node:fs/promises";
import type { BackgroundPackIndex } from "../../types.js";

export interface FlatClip {
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
export function pickClips(index: BackgroundPackIndex, targetDurationSeconds: number): FlatClip[] {
  const allClips = flattenClips(index);
  if (allClips.length === 0) {
    throw new Error("Pack de videos de fundo nao tem nenhum clipe indexado.");
  }
  if (allClips.every((clip) => clip.durationSeconds <= 0)) {
    throw new Error("Pack de videos de fundo so tem clipes de duracao zero -- reindexe o pack.");
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

/**
 * Le o indice do pack de fundo local e seleciona os clipes que cobrem a
 * duracao alvo. Nao monta nenhum video -- so escolhe os trechos; a
 * composicao final (concat + escala + legendas) acontece em um unico
 * comando ffmpeg em `composeVideo`.
 */
export async function selectLocalBackgroundClips(
  indexPath: string,
  targetDurationSeconds: number
): Promise<FlatClip[]> {
  const raw = await readFile(indexPath, "utf-8");
  const index = JSON.parse(raw) as BackgroundPackIndex;
  return pickClips(index, targetDurationSeconds);
}
