import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importScriptAndWait, mockProcessExit } from "../helpers/cli.js";
import { withTempDir } from "../helpers/tempDir.js";

vi.mock("dotenv/config", () => ({}));

const indexBackgroundPack = vi.fn(async (dirPath: string, options: unknown) => ({
  generatedAt: "2026-07-21T00:00:00.000Z",
  files: [{ fileName: "a.mp4", durationSeconds: 10, clips: [{ startSeconds: 0, endSeconds: 10 }] }],
  __calledWith: { dirPath, options },
}));

vi.mock("../../src/modules/video/index.js", () => ({
  indexBackgroundPack: (dirPath: string, options: unknown) => indexBackgroundPack(dirPath, options),
}));

describe("scripts/index-background-pack", () => {
  let originalArgv: string[];
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalArgv = process.argv;
    originalEnv = { ...process.env };
    indexBackgroundPack.mockClear();
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("indexa o pack e escreve o JSON no caminho padrao (<dir>/index.json)", async () => {
    await withTempDir(async (dir) => {
      process.argv = ["node", "index-background-pack.js", "--dir", dir];

      await importScriptAndWait("../../src/scripts/index-background-pack.js", () => {
        expect(indexBackgroundPack).toHaveBeenCalledTimes(1);
      });

      const outputPath = join(dir, "index.json");
      const raw = await readFile(outputPath, "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.files).toHaveLength(1);
    });
  });

  it("usa --output, --threshold e --min-clip-seconds quando informados", async () => {
    await withTempDir(async (dir) => {
      const customOutput = join(dir, "custom-index.json");
      process.argv = [
        "node",
        "index-background-pack.js",
        "--dir",
        dir,
        "--output",
        customOutput,
        "--threshold",
        "0.5",
        "--min-clip-seconds",
        "2",
      ];

      await importScriptAndWait("../../src/scripts/index-background-pack.js", () => {
        expect(indexBackgroundPack).toHaveBeenCalledTimes(1);
      });

      const [, options] = indexBackgroundPack.mock.calls[0] as [string, { sceneThreshold: number; minClipSeconds: number }];
      expect(options.sceneThreshold).toBe(0.5);
      expect(options.minClipSeconds).toBe(2);

      const raw = await readFile(customOutput, "utf-8");
      expect(JSON.parse(raw).files).toHaveLength(1);
    });
  });

  it("usa BACKGROUND_PACK_DIR do ambiente quando --dir nao e informado", async () => {
    await withTempDir(async (dir) => {
      process.env.BACKGROUND_PACK_DIR = dir;
      process.argv = ["node", "index-background-pack.js"];

      await importScriptAndWait("../../src/scripts/index-background-pack.js", () => {
        expect(indexBackgroundPack).toHaveBeenCalledTimes(1);
      });

      expect(indexBackgroundPack.mock.calls[0][0]).toBe(dir);
      const raw = await readFile(join(dir, "index.json"), "utf-8");
      expect(JSON.parse(raw).files).toHaveLength(1);
    });
  });

  it("termina com exit code 1 quando uma flag e informada sem valor", async () => {
    process.argv = ["node", "index-background-pack.js", "--dir"];
    const exitSpy = mockProcessExit();

    await importScriptAndWait("../../src/scripts/index-background-pack.js", () => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(indexBackgroundPack).not.toHaveBeenCalled();
  });

  it("termina com exit code 1 quando a indexacao falha", async () => {
    await withTempDir(async (dir) => {
      indexBackgroundPack.mockRejectedValueOnce(new Error("ffmpeg indisponivel"));
      process.argv = ["node", "index-background-pack.js", "--dir", dir];
      const exitSpy = mockProcessExit();

      await importScriptAndWait("../../src/scripts/index-background-pack.js", () => {
        expect(exitSpy).toHaveBeenCalledWith(1);
      });
    });
  });
});
