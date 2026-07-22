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

  describe("background single (ex: Pexels)", () => {
    it("compoe o video em um unico comando ffmpeg quando todos os arquivos de entrada existem", async () => {
      const { composeVideo } = await import("../../../src/modules/video/composeVideo.js");

      const result = await composeVideo({
        narrationAudioPath: "/tmp/narration.mp3",
        background: { kind: "single", videoPath: "/tmp/background.mp4" },
        captionsAssPath: "/tmp/captions.ass",
        outputPath: "/tmp/final.mp4",
      });

      expect(result).toEqual({ videoFilePath: "/tmp/final.mp4" });
      const inputCalls = ffmpegCalls.filter((c) => c.method === "input");
      expect(inputCalls.map((c) => c.args[0])).toEqual(["/tmp/background.mp4", "/tmp/narration.mp3"]);
      // apenas UMA chamada complexFilter/run -- uma unica recodificacao
      expect(ffmpegCalls.filter((c) => c.method === "complexFilter")).toHaveLength(1);
      const outputCall = ffmpegCalls.find((c) => c.method === "output");
      expect(outputCall?.args[0]).toBe("/tmp/final.mp4");
      const mapOptionsCall = ffmpegCalls.find((c) => c.method === "outputOptions");
      expect(mapOptionsCall?.args[0]).toEqual(
        expect.arrayContaining(["-map", "1:a"])
      );
    });

    it("rejeita sem chamar o ffmpeg quando um arquivo de entrada obrigatorio nao existe", async () => {
      existsSyncMock.mockImplementation((path: string) => path !== "/tmp/captions.ass");

      const { composeVideo } = await import("../../../src/modules/video/composeVideo.js");

      await expect(
        composeVideo({
          narrationAudioPath: "/tmp/narration.mp3",
          background: { kind: "single", videoPath: "/tmp/background.mp4" },
          captionsAssPath: "/tmp/captions.ass",
          outputPath: "/tmp/final.mp4",
        })
      ).rejects.toThrow(/composeVideo: arquivo de entrada nao encontrado \(captionsAssPath\)/);

      expect(ffmpegCalls).toHaveLength(0);
    });

    it("nao interpola caminhos de legenda com caracteres de filtergraph (jobId ja sanitizado por assertSafeId)", async () => {
      // Caminhos reais sempre derivam de um jobId validado por assertSafeId
      // (^[A-Za-z0-9_-]+$), entao nunca contem : ' , [ ] -- documentado aqui
      // como regressao para o filtro `subtitles=${captionsAssPath}`.
      const safeCaptionsPath = "storage/pending-review/story1-1721654321000/captions.ass";
      expect(safeCaptionsPath).not.toMatch(/[:,'[\]]/);

      const { composeVideo } = await import("../../../src/modules/video/composeVideo.js");

      await composeVideo({
        narrationAudioPath: "/tmp/narration.mp3",
        background: { kind: "single", videoPath: "/tmp/background.mp4" },
        captionsAssPath: safeCaptionsPath,
        outputPath: "/tmp/final.mp4",
      });

      const filterCall = ffmpegCalls.find((c) => c.method === "complexFilter");
      const filters = filterCall?.args[0] as string[];
      expect(filters.some((f) => f.includes(`subtitles=${safeCaptionsPath}`))).toBe(true);
    });

    it("propaga o erro emitido pelo ffmpeg durante a composicao", async () => {
      runBehavior = (_calls, handlers) => {
        process.nextTick(() => handlers.error?.(new Error("ffmpeg quebrou")));
      };

      const { composeVideo } = await import("../../../src/modules/video/composeVideo.js");

      await expect(
        composeVideo({
          narrationAudioPath: "/tmp/narration.mp3",
          background: { kind: "single", videoPath: "/tmp/background.mp4" },
          captionsAssPath: "/tmp/captions.ass",
          outputPath: "/tmp/final.mp4",
        })
      ).rejects.toThrow("ffmpeg quebrou");
    });
  });

  describe("background clips (pack local)", () => {
    const clips = [
      { fileName: "a.mp4", startSeconds: 0, durationSeconds: 5 },
      { fileName: "b.mp4", startSeconds: 10, durationSeconds: 5 },
    ];

    it("concatena os clipes, aplica escala/legenda e mapeia o audio da narracao em um unico comando", async () => {
      const { composeVideo } = await import("../../../src/modules/video/composeVideo.js");

      const result = await composeVideo({
        narrationAudioPath: "/tmp/narration.mp3",
        background: { kind: "clips", packDir: "/pack", clips },
        captionsAssPath: "/tmp/captions.ass",
        outputPath: "/tmp/final.mp4",
      });

      expect(result).toEqual({ videoFilePath: "/tmp/final.mp4" });
      const inputCalls = ffmpegCalls.filter((c) => c.method === "input");
      expect(inputCalls.map((c) => c.args[0])).toEqual([
        "/pack/a.mp4",
        "/pack/b.mp4",
        "/tmp/narration.mp3",
      ]);
      expect(ffmpegCalls.filter((c) => c.method === "complexFilter")).toHaveLength(1);
      const filterCall = ffmpegCalls.find((c) => c.method === "complexFilter");
      const filters = filterCall?.args[0] as string[];
      expect(filters.some((f) => f.includes("concat=n=2:v=1:a=0"))).toBe(true);
      expect(filters.some((f) => f.includes("subtitles=/tmp/captions.ass"))).toBe(true);
      const mapOptionsCall = ffmpegCalls.find((c) => c.method === "outputOptions");
      expect(mapOptionsCall?.args[0]).toEqual(
        expect.arrayContaining(["-map", "2:a"])
      );
    });

    it("rejeita sem chamar o ffmpeg quando nenhum clipe e fornecido", async () => {
      const { composeVideo } = await import("../../../src/modules/video/composeVideo.js");

      await expect(
        composeVideo({
          narrationAudioPath: "/tmp/narration.mp3",
          background: { kind: "clips", packDir: "/pack", clips: [] },
          captionsAssPath: "/tmp/captions.ass",
          outputPath: "/tmp/final.mp4",
        })
      ).rejects.toThrow(/nenhum clipe de fundo fornecido/);

      expect(ffmpegCalls).toHaveLength(0);
    });

    it("rejeita sem chamar o ffmpeg quando um arquivo de clipe nao existe", async () => {
      existsSyncMock.mockImplementation((path: string) => path !== "/pack/b.mp4");

      const { composeVideo } = await import("../../../src/modules/video/composeVideo.js");

      await expect(
        composeVideo({
          narrationAudioPath: "/tmp/narration.mp3",
          background: { kind: "clips", packDir: "/pack", clips },
          captionsAssPath: "/tmp/captions.ass",
          outputPath: "/tmp/final.mp4",
        })
      ).rejects.toThrow(/composeVideo: arquivo de entrada nao encontrado \(background\.clips\[1\]\)/);

      expect(ffmpegCalls).toHaveLength(0);
    });
  });
});
