import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withTempDir } from "../../helpers/tempDir.js";

interface FileBehavior {
  durationSeconds: number;
  sceneCutLines: string[]; // linhas de stderr, cada uma com "pts_time:<n>"
  ffprobeError?: Error;
  sceneError?: Error;
}

let behaviorByFile: Record<string, FileBehavior> = {};

function ffprobe(filePath: string, callback: (err: Error | null, data: unknown) => void) {
  const fileName = filePath.split("/").pop()!;
  const behavior = behaviorByFile[fileName];
  if (behavior.ffprobeError) {
    callback(behavior.ffprobeError, null);
    return;
  }
  callback(null, { format: { duration: behavior.durationSeconds } });
}

function createSceneChainable(filePath: string) {
  const fileName = filePath.split("/").pop()!;
  const behavior = behaviorByFile[fileName];
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const chainable: Record<string, (...args: any[]) => any> = {
    outputOptions: () => chainable,
    output: () => chainable,
    on: (event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = cb;
      return chainable;
    },
    run: () => {
      process.nextTick(() => {
        if (behavior.sceneError) {
          handlers.error?.(behavior.sceneError);
          return;
        }
        for (const line of behavior.sceneCutLines) {
          handlers.stderr?.(line);
        }
        handlers.end?.();
      });
    },
  };
  return chainable;
}

vi.mock("fluent-ffmpeg", () => {
  const fn = (filePath: string) => createSceneChainable(filePath);
  fn.ffprobe = ffprobe;
  return { default: fn };
});

describe("indexBackgroundPack", () => {
  beforeEach(() => {
    behaviorByFile = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ignora arquivos que nao sao de video e ordena os indexados por nome", async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, "b.mp4"), "");
      await writeFile(join(dir, "a.mov"), "");
      await writeFile(join(dir, "leiame.txt"), "nao e video");

      behaviorByFile = {
        "a.mov": { durationSeconds: 10, sceneCutLines: [] },
        "b.mp4": { durationSeconds: 20, sceneCutLines: [] },
      };

      const { indexBackgroundPack } = await import("../../../src/modules/video/backgroundPackIndexer.js");
      const index = await indexBackgroundPack(dir);

      expect(index.files.map((f) => f.fileName)).toEqual(["a.mov", "b.mp4"]);
      expect(index.files[0].durationSeconds).toBe(10);
      expect(index.files[0].clips).toEqual([{ startSeconds: 0, endSeconds: 10 }]);
    });
  });

  it("cria multiplos clipes a partir dos cortes de cena detectados", async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, "video.mp4"), "");

      behaviorByFile = {
        "video.mp4": {
          durationSeconds: 30,
          sceneCutLines: [
            "algo pts_time:10.0 outro",
            "linha sem timestamp, deve ser ignorada",
            "pts_time:20.0",
          ],
        },
      };

      const { indexBackgroundPack } = await import("../../../src/modules/video/backgroundPackIndexer.js");
      const index = await indexBackgroundPack(dir, { minClipSeconds: 1.5 });

      expect(index.files[0].clips).toEqual([
        { startSeconds: 0, endSeconds: 10 },
        { startSeconds: 10, endSeconds: 20 },
        { startSeconds: 20, endSeconds: 30 },
      ]);
    });
  });

  it("funde clipes menores que minClipSeconds com o vizinho", async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, "video.mp4"), "");

      behaviorByFile = {
        // corte bem cedo (0.5s) gera um primeiro clipe curto que deve ser fundido
        "video.mp4": { durationSeconds: 30, sceneCutLines: ["pts_time:0.5"] },
      };

      const { indexBackgroundPack } = await import("../../../src/modules/video/backgroundPackIndexer.js");
      const index = await indexBackgroundPack(dir, { minClipSeconds: 1.5 });

      expect(index.files[0].clips).toEqual([{ startSeconds: 0, endSeconds: 30 }]);
    });
  });

  it("funde o ultimo clipe com o penultimo quando o ultimo fica curto demais", async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, "video.mp4"), "");

      // cortes em 10s e 29s: o ultimo trecho (29-30 = 1s) fica curto demais e
      // deve ser fundido de volta com o penultimo (10-29s)
      behaviorByFile = {
        "video.mp4": { durationSeconds: 30, sceneCutLines: ["pts_time:10.0", "pts_time:29.0"] },
      };

      const { indexBackgroundPack } = await import("../../../src/modules/video/backgroundPackIndexer.js");
      const index = await indexBackgroundPack(dir, { minClipSeconds: 1.5 });

      expect(index.files[0].clips).toEqual([
        { startSeconds: 0, endSeconds: 10 },
        { startSeconds: 10, endSeconds: 30 },
      ]);
    });
  });

  it("propaga erro quando o ffprobe nao consegue determinar a duracao (duration ausente)", async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, "video.mp4"), "");
      behaviorByFile = {
        "video.mp4": { durationSeconds: 0, sceneCutLines: [] },
      };

      const { indexBackgroundPack } = await import("../../../src/modules/video/backgroundPackIndexer.js");
      await expect(indexBackgroundPack(dir)).rejects.toThrow(
        /Nao foi possivel obter a duracao de/
      );
    });
  });

  it("propaga erro quando nao consegue obter a duracao do video", async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, "video.mp4"), "");
      behaviorByFile = {
        "video.mp4": { durationSeconds: 0, sceneCutLines: [], ffprobeError: new Error("ffprobe falhou") },
      };

      const { indexBackgroundPack } = await import("../../../src/modules/video/backgroundPackIndexer.js");
      await expect(indexBackgroundPack(dir)).rejects.toThrow("ffprobe falhou");
    });
  });
});
