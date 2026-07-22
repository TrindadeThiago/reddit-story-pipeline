import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv/config", () => ({}));

const execFileMock = vi.fn(
  (
    _command: string,
    _args: string[],
    callback: (err: Error | null, result: { stdout: string; stderr: string }) => void
  ) => {
    callback(null, { stdout: "", stderr: "" });
  }
);

vi.mock("node:child_process", () => ({
  execFile: (command: string, args: string[], callback: unknown) =>
    execFileMock(command, args, callback as never),
}));

const existsSyncMock = vi.fn((_path: string) => false);
vi.mock("node:fs", () => ({
  existsSync: (path: string) => existsSyncMock(path),
}));

const readFileMock = vi.fn(async (_path: string, _encoding: string) =>
  JSON.stringify([{ word: "oi", startSeconds: 0, endSeconds: 0.3 }])
);
vi.mock("node:fs/promises", () => ({
  readFile: (path: string, encoding: string) => readFileMock(path, encoding),
}));

const buildHighlightedAssMock = vi.fn(async (_words: unknown, _outputPath: string) => undefined);
vi.mock("../../../src/modules/captions/buildHighlightedAss.js", () => ({
  buildHighlightedAss: (words: unknown, outputPath: string) =>
    buildHighlightedAssMock(words, outputPath),
}));

describe("generateCaptions", () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    execFileMock.mockClear();
    existsSyncMock.mockClear();
    readFileMock.mockClear();
    buildHighlightedAssMock.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it("transcreve via WhisperX (venv detectado) e monta o .ass destacado", async () => {
    delete process.env.WHISPERX_PYTHON_BIN;
    existsSyncMock.mockReturnValue(true);

    const { generateCaptions } = await import("../../../src/modules/captions/generateCaptions.js");

    const result = await generateCaptions("narration.mp3", "out/captions.srt", "base");

    expect(execFileMock).toHaveBeenCalledWith(
      ".venv-whisperx/bin/python3",
      expect.arrayContaining(["scripts/transcribe.py", "--audio", "narration.mp3"]),
      expect.any(Function)
    );
    expect(result.words).toEqual([{ word: "oi", startSeconds: 0, endSeconds: 0.3 }]);
    expect(result.srtFilePath).toBe("out/captions.srt");
    expect(result.assFilePath).toBe("out/captions.ass");
    expect(buildHighlightedAssMock).toHaveBeenCalledWith(result.words, "out/captions.ass");
  });

  it("usa python3 do PATH quando o venv nao existe e WHISPERX_PYTHON_BIN nao esta definido", async () => {
    delete process.env.WHISPERX_PYTHON_BIN;
    existsSyncMock.mockReturnValue(false);

    const { generateCaptions } = await import("../../../src/modules/captions/generateCaptions.js");
    await generateCaptions("narration.mp3", "out/captions.srt", "base");

    expect(execFileMock).toHaveBeenCalledWith("python3", expect.any(Array), expect.any(Function));
  });

  it("usa WHISPERX_PYTHON_BIN quando definido, sem checar o venv", async () => {
    process.env.WHISPERX_PYTHON_BIN = "/usr/bin/python3.11";

    const { generateCaptions } = await import("../../../src/modules/captions/generateCaptions.js");
    await generateCaptions("narration.mp3", "out/captions.srt", "base");

    expect(execFileMock).toHaveBeenCalledWith(
      "/usr/bin/python3.11",
      expect.any(Array),
      expect.any(Function)
    );
    expect(existsSyncMock).not.toHaveBeenCalled();
  });

  it("propaga o erro quando o script de transcricao falha", async () => {
    execFileMock.mockImplementationOnce((_cmd, _args, callback) => {
      callback(new Error("transcribe.py falhou"), { stdout: "", stderr: "" });
    });

    const { generateCaptions } = await import("../../../src/modules/captions/generateCaptions.js");

    await expect(
      generateCaptions("narration.mp3", "out/captions.srt", "base")
    ).rejects.toThrow("transcribe.py falhou");
    expect(buildHighlightedAssMock).not.toHaveBeenCalled();
  });
});
