import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const existsSyncMock = vi.fn((_path: string) => true);
vi.mock("node:fs", () => ({
  existsSync: (path: string) => existsSyncMock(path),
}));

interface FfmpegCall {
  method: string;
  args: unknown[];
}

let runBehavior: (calls: FfmpegCall[], handlers: Record<string, (...args: unknown[]) => void>) => void;

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
  chainable.run = () => {
    runBehavior(ffmpegCalls, handlers);
  };
  return chainable;
}

vi.mock("fluent-ffmpeg", () => ({
  default: () => createChainable(),
}));

describe("composeVideo", () => {
  beforeEach(() => {
    ffmpegCalls.length = 0;
    existsSyncMock.mockReturnValue(true);
    runBehavior = (_calls, handlers) => {
      process.nextTick(() => handlers.end?.());
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("compoe o video com sucesso quando todos os arquivos de entrada existem", async () => {
    const { composeVideo } = await import("../../../src/modules/video/composeVideo.js");

    const result = await composeVideo({
      narrationAudioPath: "/tmp/narration.mp3",
      backgroundVideoPath: "/tmp/background.mp4",
      captionsAssPath: "/tmp/captions.ass",
      outputPath: "/tmp/final.mp4",
    });

    expect(result).toEqual({ videoFilePath: "/tmp/final.mp4" });
    const inputCalls = ffmpegCalls.filter((c) => c.method === "input");
    expect(inputCalls.map((c) => c.args[0])).toEqual(["/tmp/background.mp4", "/tmp/narration.mp3"]);
    const outputCall = ffmpegCalls.find((c) => c.method === "output");
    expect(outputCall?.args[0]).toBe("/tmp/final.mp4");
  });

  it("rejeita sem chamar o ffmpeg quando um arquivo de entrada obrigatorio nao existe", async () => {
    existsSyncMock.mockImplementation((path: string) => path !== "/tmp/captions.ass");

    const { composeVideo } = await import("../../../src/modules/video/composeVideo.js");

    await expect(
      composeVideo({
        narrationAudioPath: "/tmp/narration.mp3",
        backgroundVideoPath: "/tmp/background.mp4",
        captionsAssPath: "/tmp/captions.ass",
        outputPath: "/tmp/final.mp4",
      })
    ).rejects.toThrow(/composeVideo: arquivo de entrada nao encontrado \(captionsAssPath\)/);

    expect(ffmpegCalls).toHaveLength(0);
  });

  it("propaga o erro emitido pelo ffmpeg durante a composicao", async () => {
    runBehavior = (_calls, handlers) => {
      process.nextTick(() => handlers.error?.(new Error("ffmpeg quebrou")));
    };

    const { composeVideo } = await import("../../../src/modules/video/composeVideo.js");

    await expect(
      composeVideo({
        narrationAudioPath: "/tmp/narration.mp3",
        backgroundVideoPath: "/tmp/background.mp4",
        captionsAssPath: "/tmp/captions.ass",
        outputPath: "/tmp/final.mp4",
      })
    ).rejects.toThrow("ffmpeg quebrou");
  });
});
