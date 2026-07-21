import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import ffmpeg from "fluent-ffmpeg";
import type { BackgroundClip, BackgroundPackFileIndex, BackgroundPackIndex } from "../../types.js";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".mkv", ".webm"]);
const DEFAULT_SCENE_THRESHOLD = 0.3; // ffmpeg scene score (0-1): quanto maior, menos cortes detectados
const DEFAULT_MIN_CLIP_SECONDS = 1.5; // clipes menores que isso sao fundidos com o vizinho

const PTS_TIME_REGEX = /pts_time:([\d.]+)/;

function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      const duration = data.format.duration;
      if (!duration) {
        reject(new Error(`Nao foi possivel obter a duracao de: ${filePath}`));
        return;
      }
      resolve(duration);
    });
  });
}

/**
 * Detecta os pontos de corte de cena (mudancas bruscas de frame) usando o
 * filtro `select='gt(scene,threshold)'` do ffmpeg, que e como identificamos
 * onde um trecho curto termina e o proximo comeca dentro do video compilado.
 */
function detectSceneCuts(filePath: string, threshold: number): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const cuts: number[] = [];
    ffmpeg(filePath)
      .outputOptions([
        "-vf",
        `select='gt(scene,${threshold})',showinfo`,
        "-f",
        "null",
      ])
      .output("-")
      .on("stderr", (line: string) => {
        const match = PTS_TIME_REGEX.exec(line);
        if (match) {
          cuts.push(Number.parseFloat(match[1]));
        }
      })
      .on("end", () => resolve(cuts))
      .on("error", reject)
      .run();
  });
}

/**
 * Converte os pontos de corte em intervalos [inicio, fim], fundindo clipes
 * mais curtos que minClipSeconds com o clipe seguinte para evitar trechos
 * curtos demais para servir de fundo.
 */
function buildClips(
  cutTimestamps: number[],
  durationSeconds: number,
  minClipSeconds: number
): BackgroundClip[] {
  const boundaries = [0, ...cutTimestamps.filter((t) => t > 0 && t < durationSeconds), durationSeconds];
  const rawClips: BackgroundClip[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    rawClips.push({ startSeconds: boundaries[i], endSeconds: boundaries[i + 1] });
  }

  const merged: BackgroundClip[] = [];
  for (const clip of rawClips) {
    const previous = merged[merged.length - 1];
    if (previous && previous.endSeconds - previous.startSeconds < minClipSeconds) {
      previous.endSeconds = clip.endSeconds;
    } else {
      merged.push({ ...clip });
    }
  }
  // se o ultimo clipe ficou curto demais, funde com o anterior
  if (merged.length > 1) {
    const last = merged[merged.length - 1];
    if (last.endSeconds - last.startSeconds < minClipSeconds) {
      merged[merged.length - 2].endSeconds = last.endSeconds;
      merged.pop();
    }
  }

  return merged;
}

async function indexFile(
  filePath: string,
  fileName: string,
  threshold: number,
  minClipSeconds: number
): Promise<BackgroundPackFileIndex> {
  const [durationSeconds, cutTimestamps] = await Promise.all([
    getVideoDuration(filePath),
    detectSceneCuts(filePath, threshold),
  ]);

  const clips = buildClips(cutTimestamps, durationSeconds, minClipSeconds);

  return { fileName, durationSeconds, clips };
}

export async function indexBackgroundPack(
  dirPath: string,
  options: { sceneThreshold?: number; minClipSeconds?: number } = {}
): Promise<BackgroundPackIndex> {
  const threshold = options.sceneThreshold ?? DEFAULT_SCENE_THRESHOLD;
  const minClipSeconds = options.minClipSeconds ?? DEFAULT_MIN_CLIP_SECONDS;

  const entries = await readdir(dirPath, { withFileTypes: true });
  const videoFiles = entries
    .filter((entry) => entry.isFile() && VIDEO_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort();

  const files: BackgroundPackFileIndex[] = [];
  for (const fileName of videoFiles) {
    const filePath = join(dirPath, fileName);
    files.push(await indexFile(filePath, fileName, threshold, minClipSeconds));
  }

  return { generatedAt: new Date().toISOString(), files };
}
