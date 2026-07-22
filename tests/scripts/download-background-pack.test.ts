import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importScriptAndWait, mockProcessExit } from "../helpers/cli.js";
import { withTempDir } from "../helpers/tempDir.js";

vi.mock("dotenv/config", () => ({}));

const mkdirMock = vi.fn<(path: string, opts?: unknown) => Promise<unknown>>();
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    mkdir: (path: string, opts?: unknown) => mkdirMock(path, opts),
  };
});

type FakeChild = EventEmitter & { stdio?: unknown };

let nextChildBehavior: (child: FakeChild) => void = (child) => {
  process.nextTick(() => child.emit("close", 0));
};

const spawnCalls: Array<{ command: string; args: string[] }> = [];

vi.mock("node:child_process", () => ({
  spawn: (command: string, args: string[]) => {
    spawnCalls.push({ command, args });
    const child: FakeChild = new EventEmitter();
    nextChildBehavior(child);
    return child;
  },
}));

describe("scripts/download-background-pack", () => {
  let originalArgv: string[];
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalArgv = process.argv;
    originalEnv = { ...process.env };
    spawnCalls.length = 0;
    nextChildBehavior = (child) => {
      process.nextTick(() => child.emit("close", 0));
    };
    mkdirMock.mockReset();
    mkdirMock.mockImplementation(async () => undefined);
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("baixa a playlist inteira via yt-dlp quando nenhuma flag e informada", async () => {
    await withTempDir(async (dir) => {
      process.argv = [
        "node",
        "download-background-pack.js",
        "--url",
        "https://youtube.com/playlist?list=abc",
        "--output",
        dir,
      ];

      await importScriptAndWait("../../src/scripts/download-background-pack.js", () => {
        expect(spawnCalls.length).toBe(1);
      });

      expect(spawnCalls[0].command).toBe("yt-dlp");
      expect(spawnCalls[0].args).not.toContain("--playlist-items");
    });
  });

  it("aplica --limit como --playlist-items 1-N", async () => {
    await withTempDir(async (dir) => {
      process.argv = [
        "node",
        "download-background-pack.js",
        "--url",
        "https://youtube.com/playlist?list=abc",
        "--output",
        dir,
        "--limit",
        "3",
      ];

      await importScriptAndWait("../../src/scripts/download-background-pack.js", () => {
        expect(spawnCalls.length).toBe(1);
      });

      const idx = spawnCalls[0].args.indexOf("--playlist-items");
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(spawnCalls[0].args[idx + 1]).toBe("1-3");
    });
  });

  it("termina com exit code 1 quando uma flag e informada sem valor (--url no fim dos argumentos)", async () => {
    process.argv = ["node", "download-background-pack.js", "--url"];
    const exitSpy = mockProcessExit();

    await importScriptAndWait("../../src/scripts/download-background-pack.js", () => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(spawnCalls.length).toBe(0);
  });

  it("termina com exit code 1 quando --limit nao e um inteiro positivo", async () => {
    process.argv = [
      "node",
      "download-background-pack.js",
      "--url",
      "https://youtube.com/playlist?list=abc",
      "--limit",
      "abc",
    ];
    const exitSpy = mockProcessExit();

    await importScriptAndWait("../../src/scripts/download-background-pack.js", () => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(spawnCalls.length).toBe(0);
  });

  it("termina com exit code 1 quando nenhuma URL de playlist e informada", async () => {
    delete process.env.BACKGROUND_PACK_PLAYLIST_URL;
    process.argv = ["node", "download-background-pack.js"];
    const exitSpy = mockProcessExit();

    await importScriptAndWait("../../src/scripts/download-background-pack.js", () => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(spawnCalls.length).toBe(0);
  });

  it("reporta erro claro quando yt-dlp nao esta instalado (ENOENT)", async () => {
    nextChildBehavior = (child) => {
      process.nextTick(() => {
        const err = new Error("not found") as NodeJS.ErrnoException;
        err.code = "ENOENT";
        child.emit("error", err);
      });
    };

    await withTempDir(async (dir) => {
      process.argv = [
        "node",
        "download-background-pack.js",
        "--url",
        "https://youtube.com/playlist?list=abc",
        "--output",
        dir,
      ];
      const exitSpy = mockProcessExit();

      await importScriptAndWait("../../src/scripts/download-background-pack.js", () => {
        expect(exitSpy).toHaveBeenCalledWith(1);
      });
    });
  });

  it("usa String(err) quando o erro capturado nao tem 'message' (nao e um Error)", async () => {
    mkdirMock.mockRejectedValueOnce("disco cheio" as unknown as Error);

    await withTempDir(async (dir) => {
      process.argv = [
        "node",
        "download-background-pack.js",
        "--url",
        "https://youtube.com/playlist?list=abc",
        "--output",
        dir,
      ];
      const exitSpy = mockProcessExit();

      await importScriptAndWait("../../src/scripts/download-background-pack.js", () => {
        expect(exitSpy).toHaveBeenCalledWith(1);
      });

      expect(spawnCalls.length).toBe(0);
    });
  });

  it("reporta o erro original quando spawn falha por um motivo diferente de ENOENT", async () => {
    nextChildBehavior = (child) => {
      process.nextTick(() => {
        const err = new Error("permissao negada") as NodeJS.ErrnoException;
        err.code = "EACCES";
        child.emit("error", err);
      });
    };

    await withTempDir(async (dir) => {
      process.argv = [
        "node",
        "download-background-pack.js",
        "--url",
        "https://youtube.com/playlist?list=abc",
        "--output",
        dir,
      ];
      const exitSpy = mockProcessExit();

      await importScriptAndWait("../../src/scripts/download-background-pack.js", () => {
        expect(exitSpy).toHaveBeenCalledWith(1);
      });
    });
  });

  it("reporta erro quando yt-dlp termina com codigo diferente de zero", async () => {
    nextChildBehavior = (child) => {
      process.nextTick(() => child.emit("close", 1));
    };

    await withTempDir(async (dir) => {
      process.argv = [
        "node",
        "download-background-pack.js",
        "--url",
        "https://youtube.com/playlist?list=abc",
        "--output",
        dir,
      ];
      const exitSpy = mockProcessExit();

      await importScriptAndWait("../../src/scripts/download-background-pack.js", () => {
        expect(exitSpy).toHaveBeenCalledWith(1);
      });
    });
  });
});
