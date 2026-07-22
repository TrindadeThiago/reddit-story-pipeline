import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withTempDir } from "../../helpers/tempDir.js";
import type { BackgroundPackIndex } from "../../../src/types.js";

interface FfmpegCall {
  method: string;
  args: unknown[];
}

let runBehavior: (handlers: Record<string, (...args: unknown[]) => void>) => void;
const ffmpegCalls: FfmpegCall[] = [];

function createChainable() {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const chainable: Record<string, (...args: any[]) => any> = {};
  for (const method of ["input", "inputOptions", "complexFilter", "map", "outputOptions", "output"]) {
    chainable[method] = (...args: unknown[]) => {
      ffmpegCalls.push({ method, args });
      return chainable;
    };
  }
  chainable.on = (event: string, cb: (...args: unknown[]) => void) => {
    handlers[event] = cb;
    return chainable;
  };
  chainable.run = () => runBehavior(handlers);
  return chainable;
}

vi.mock("fluent-ffmpeg", () => ({
  default: () => createChainable(),
}));

describe("buildLocalBackgroundVideo", () => {
  beforeEach(() => {
    ffmpegCalls.length = 0;
    runBehavior = (handlers) => process.nextTick(() => handlers.end?.());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("seleciona clipes suficientes para cobrir a duracao alvo + margem e monta o ffmpeg", async () => {
    await withTempDir(async (dir) => {
      const index: BackgroundPackIndex = {
        generatedAt: "2026-07-21T00:00:00.000Z",
        files: [
          { fileName: "a.mp4", durationSeconds: 20, clips: [{ startSeconds: 0, endSeconds: 10 }, { startSeconds: 10, endSeconds: 20 }] },
          { fileName: "b.mp4", durationSeconds: 15, clips: [{ startSeconds: 0, endSeconds: 15 }] },
        ],
      };
      const indexPath = join(dir, "index.json");
      await writeFile(indexPath, JSON.stringify(index));

      const { buildLocalBackgroundVideo } = await import(
        "../../../src/modules/video/localBackgroundProvider.js"
      );

      await buildLocalBackgroundVideo(dir, indexPath, 5, join(dir, "out.mp4"));

      const inputCalls = ffmpegCalls.filter((c) => c.method === "input");
      // duracao alvo (5s) + margem (2s) = 7s; o menor clipe unico ja cobre isso,
      // entao pelo menos 1 clipe deve ter sido selecionado
      expect(inputCalls.length).toBeGreaterThanOrEqual(1);
      const complexFilterCall = ffmpegCalls.find((c) => c.method === "complexFilter");
      expect(complexFilterCall).toBeDefined();
      const outputCall = ffmpegCalls.find((c) => c.method === "output");
      expect(outputCall?.args[0]).toBe(join(dir, "out.mp4"));
    });
  });

  it("continua sorteando clipes ate somar a duracao alvo quando um unico clipe nao e suficiente", async () => {
    await withTempDir(async (dir) => {
      const index: BackgroundPackIndex = {
        generatedAt: "2026-07-21T00:00:00.000Z",
        files: [
          {
            fileName: "a.mp4",
            durationSeconds: 3,
            clips: [
              { startSeconds: 0, endSeconds: 1 },
              { startSeconds: 1, endSeconds: 2 },
              { startSeconds: 2, endSeconds: 3 },
            ],
          },
        ],
      };
      const indexPath = join(dir, "index.json");
      await writeFile(indexPath, JSON.stringify(index));

      const { buildLocalBackgroundVideo } = await import(
        "../../../src/modules/video/localBackgroundProvider.js"
      );

      // alvo (5s) + margem (2s) = 7s, mas o pack so tem 3s de clipes por
      // volta -- precisa reembaralhar/repetir mais de uma vez para fechar o total
      await buildLocalBackgroundVideo(dir, indexPath, 5, join(dir, "out.mp4"));

      const inputCalls = ffmpegCalls.filter((c) => c.method === "input");
      expect(inputCalls.length).toBeGreaterThan(3);
    });
  });

  it("lanca erro quando o indice nao tem nenhum clipe", async () => {
    await withTempDir(async (dir) => {
      const index: BackgroundPackIndex = { generatedAt: "2026-07-21T00:00:00.000Z", files: [] };
      const indexPath = join(dir, "index.json");
      await writeFile(indexPath, JSON.stringify(index));

      const { buildLocalBackgroundVideo } = await import(
        "../../../src/modules/video/localBackgroundProvider.js"
      );

      await expect(
        buildLocalBackgroundVideo(dir, indexPath, 5, join(dir, "out.mp4"))
      ).rejects.toThrow("Pack de videos de fundo nao tem nenhum clipe indexado.");
      expect(ffmpegCalls).toHaveLength(0);
    });
  });

  it("propaga o erro emitido pelo ffmpeg durante a montagem", async () => {
    runBehavior = (handlers) => process.nextTick(() => handlers.error?.(new Error("falha ao concatenar")));

    await withTempDir(async (dir) => {
      const index: BackgroundPackIndex = {
        generatedAt: "2026-07-21T00:00:00.000Z",
        files: [{ fileName: "a.mp4", durationSeconds: 20, clips: [{ startSeconds: 0, endSeconds: 20 }] }],
      };
      const indexPath = join(dir, "index.json");
      await writeFile(indexPath, JSON.stringify(index));

      const { buildLocalBackgroundVideo } = await import(
        "../../../src/modules/video/localBackgroundProvider.js"
      );

      await expect(
        buildLocalBackgroundVideo(dir, indexPath, 5, join(dir, "out.mp4"))
      ).rejects.toThrow("falha ao concatenar");
    });
  });
});
