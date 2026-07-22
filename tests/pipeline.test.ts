import { Writable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubFetch } from "./helpers/mockFetch.js";

const mkdir = vi.fn(async (_path: string, _opts?: unknown) => undefined);

vi.mock("node:fs/promises", () => ({
  mkdir: (path: string, opts?: unknown) => mkdir(path, opts),
}));

const createWriteStream = vi.fn((_path: string) => {
  const chunks: Buffer[] = [];
  return new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });
});

vi.mock("node:fs", () => ({
  createWriteStream: (path: string) => createWriteStream(path),
}));

const generateCaptions = vi.fn(async (_audioPath: string, srtPath: string, _modelSize: string) => ({
  words: [{ word: "oi", startSeconds: 0, endSeconds: 0.5 }],
  srtFilePath: srtPath,
  assFilePath: srtPath.replace(/\.srt$/, ".ass"),
}));

vi.mock("../src/modules/captions/index.js", () => ({
  generateCaptions: (audioPath: string, srtPath: string, modelSize: string) =>
    generateCaptions(audioPath, srtPath, modelSize),
}));

const selectLocalBackgroundClips = vi.fn(async (_indexPath: string, _duration: number) => [
  { fileName: "a.mp4", startSeconds: 0, durationSeconds: 10 },
]);
const findBackgroundVideo = vi.fn(async (_query: string, _key: string, _url: string) => ({
  downloadUrl: "https://cdn.pexels.com/video.mp4",
  durationSeconds: 30,
}));
const composeVideo = vi.fn(async (options: { outputPath: string; background: unknown }) => ({
  videoFilePath: options.outputPath,
}));

vi.mock("../src/modules/video/index.js", () => ({
  selectLocalBackgroundClips: (indexPath: string, duration: number) =>
    selectLocalBackgroundClips(indexPath, duration),
  findBackgroundVideo: (query: string, key: string, url: string) => findBackgroundVideo(query, key, url),
  composeVideo: (options: { outputPath: string; background: unknown }) => composeVideo(options),
}));

const enqueueForReview = vi.fn(async (_job: unknown) => "storage/pending-review/job-1");

vi.mock("../src/modules/review/index.js", () => ({
  enqueueForReview: (job: unknown) => enqueueForReview(job),
}));

const story = { id: "s1", subreddit: "AskHistorians", title: "t", body: "corpo da historia", url: "u", score: 900 };

function fakeTtsProvider(name: "piper" | "elevenlabs" = "piper") {
  return {
    name,
    fileExtension: name === "piper" ? "wav" : "mp3",
    synthesize: vi.fn(async (_text: string, outputPath: string) => ({
      provider: name,
      audioFilePath: outputPath,
      charactersUsed: 10,
    })),
  };
}

describe("pipeline/runPipelineForStory", () => {
  beforeEach(() => {
    mkdir.mockClear();
    createWriteStream.mockClear();
    generateCaptions.mockClear();
    selectLocalBackgroundClips.mockClear();
    findBackgroundVideo.mockClear();
    composeVideo.mockClear();
    enqueueForReview.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("roda as etapas em ordem e enfileira o job para revisao (fonte local)", async () => {
    const { runPipelineForStory } = await import("../src/pipeline.js");
    const tts = fakeTtsProvider();

    const job = await runPipelineForStory(story, {
      ttsProvider: tts,
      whisperModelSize: "base",
      backgroundSource: "local",
      backgroundPackDir: "storage/background-pack",
      backgroundPackIndexPath: "storage/background-pack/index.json",
    });

    expect(tts.synthesize).toHaveBeenCalledTimes(1);
    expect(generateCaptions).toHaveBeenCalledTimes(1);
    expect(selectLocalBackgroundClips).toHaveBeenCalledTimes(1);
    expect(findBackgroundVideo).not.toHaveBeenCalled();
    expect(composeVideo).toHaveBeenCalledTimes(1);
    const composeOptions = composeVideo.mock.calls[0][0] as { background: unknown };
    expect(composeOptions.background).toEqual({
      kind: "clips",
      packDir: "storage/background-pack",
      clips: [{ fileName: "a.mp4", startSeconds: 0, durationSeconds: 10 }],
    });
    expect(enqueueForReview).toHaveBeenCalledTimes(1);
    expect(job.jobId).toContain(story.id);
    expect(job.narration?.provider).toBe("piper");
  });

  it("baixa o video de fundo do Pexels quando a fonte e 'pexels'", async () => {
    const fetchStub = stubFetch(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));

    try {
      const { runPipelineForStory } = await import("../src/pipeline.js");
      const tts = fakeTtsProvider();

      await runPipelineForStory(story, {
        ttsProvider: tts,
        whisperModelSize: "base",
        backgroundSource: "pexels",
        pexelsApiKey: "key",
        pexelsApiUrl: "https://api.pexels.com",
        backgroundQuery: "pessoa organizando",
      });

      expect(findBackgroundVideo).toHaveBeenCalledTimes(1);
      expect(selectLocalBackgroundClips).not.toHaveBeenCalled();
      expect(createWriteStream).toHaveBeenCalled();
      const composeOptions = composeVideo.mock.calls[0][0] as { background: { kind: string } };
      expect(composeOptions.background.kind).toBe("single");
    } finally {
      fetchStub.restore();
    }
  });

  it("contextualiza o erro com a etapa e o jobId quando uma etapa falha (isolamento de falhas)", async () => {
    const { runPipelineForStory } = await import("../src/pipeline.js");
    const tts = fakeTtsProvider();
    generateCaptions.mockRejectedValueOnce(new Error("whisperx indisponivel"));

    await expect(
      runPipelineForStory(story, {
        ttsProvider: tts,
        whisperModelSize: "base",
        backgroundSource: "local",
        backgroundPackDir: "storage/background-pack",
        backgroundPackIndexPath: "storage/background-pack/index.json",
      })
    ).rejects.toThrow(/falha na etapa "legenda"/);

    expect(composeVideo).not.toHaveBeenCalled();
    expect(enqueueForReview).not.toHaveBeenCalled();
  });

  it("contextualiza a etapa mesmo quando o erro lancado nao e uma instancia de Error", async () => {
    const { runPipelineForStory } = await import("../src/pipeline.js");
    const tts = fakeTtsProvider();
    generateCaptions.mockRejectedValueOnce("falha nao-Error");

    await expect(
      runPipelineForStory(story, {
        ttsProvider: tts,
        whisperModelSize: "base",
        backgroundSource: "local",
        backgroundPackDir: "storage/background-pack",
        backgroundPackIndexPath: "storage/background-pack/index.json",
      })
    ).rejects.toThrow(/falha na etapa "legenda".*falha nao-Error/);
  });

  it("usa 0 como duracao da narracao quando nao ha nenhuma palavra transcrita (fonte local)", async () => {
    generateCaptions.mockResolvedValueOnce({
      words: [],
      srtFilePath: "captions.srt",
      assFilePath: "captions.ass",
    });

    const { runPipelineForStory } = await import("../src/pipeline.js");
    const tts = fakeTtsProvider();

    await runPipelineForStory(story, {
      ttsProvider: tts,
      whisperModelSize: "base",
      backgroundSource: "local",
      backgroundPackDir: "storage/background-pack",
      backgroundPackIndexPath: "storage/background-pack/index.json",
    });

    expect(selectLocalBackgroundClips).toHaveBeenCalledWith(
      "storage/background-pack/index.json",
      0
    );
  });

  it("rejeita story.id fora da whitelist antes de qualquer escrita em disco", async () => {
    const { runPipelineForStory } = await import("../src/pipeline.js");
    const tts = fakeTtsProvider();
    const maliciousStory = { ...story, id: "../../tmp/evil" };

    await expect(
      runPipelineForStory(maliciousStory, {
        ttsProvider: tts,
        whisperModelSize: "base",
        backgroundSource: "local",
        backgroundPackDir: "storage/background-pack",
        backgroundPackIndexPath: "storage/background-pack/index.json",
      })
    ).rejects.toThrow(/story\.id invalido/);

    expect(mkdir).not.toHaveBeenCalled();
    expect(tts.synthesize).not.toHaveBeenCalled();
  });

  it("propaga erro de download quando a resposta do Pexels nao e ok", async () => {
    const fetchStub = stubFetch(async () => new Response("erro", { status: 500 }));

    try {
      const { runPipelineForStory } = await import("../src/pipeline.js");
      const tts = fakeTtsProvider();

      await expect(
        runPipelineForStory(story, {
          ttsProvider: tts,
          whisperModelSize: "base",
          backgroundSource: "pexels",
          pexelsApiKey: "key",
          pexelsApiUrl: "https://api.pexels.com",
          backgroundQuery: "pessoa organizando",
        })
      ).rejects.toThrow(/falha na etapa "vídeo de fundo"/);
    } finally {
      fetchStub.restore();
    }
  });

  it("propaga erro de download quando a resposta do Pexels nao tem corpo", async () => {
    const fetchStub = stubFetch(async () => new Response(null, { status: 200 }));

    try {
      const { runPipelineForStory } = await import("../src/pipeline.js");
      const tts = fakeTtsProvider();

      await expect(
        runPipelineForStory(story, {
          ttsProvider: tts,
          whisperModelSize: "base",
          backgroundSource: "pexels",
          pexelsApiKey: "key",
          pexelsApiUrl: "https://api.pexels.com",
          backgroundQuery: "pessoa organizando",
        })
      ).rejects.toThrow(/resposta sem corpo/);
    } finally {
      fetchStub.restore();
    }
  });
});
