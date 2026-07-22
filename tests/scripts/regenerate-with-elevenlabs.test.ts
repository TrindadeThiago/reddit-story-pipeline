import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importScriptAndWait, mockProcessExit } from "../helpers/cli.js";

vi.mock("dotenv/config", () => ({}));

const readPendingJob = vi.fn(async (jobId: string) => ({
  jobId,
  story: { id: "s1", subreddit: "AskHistorians", title: "t", body: "b", url: "u", score: 1 },
}));

vi.mock("../../src/modules/review/index.js", () => ({
  readPendingJob: (jobId: string) => readPendingJob(jobId),
}));

class FakeElevenLabsProvider {
  readonly name = "elevenlabs" as const;
  constructor(public apiKey: string, public voiceId: string) {}
}
class FakeQuotaTracker {}

const ElevenLabsProviderCtor = vi.fn((...args: unknown[]) => new FakeElevenLabsProvider(args[0] as string, args[1] as string));
const QuotaTrackerCtor = vi.fn((..._args: unknown[]) => new FakeQuotaTracker());

vi.mock("../../src/modules/tts/index.js", () => ({
  ElevenLabsProvider: function (this: unknown, ...args: unknown[]) {
    return ElevenLabsProviderCtor(...args);
  },
  QuotaTracker: function (this: unknown, ...args: unknown[]) {
    return QuotaTrackerCtor(...args);
  },
}));

const runPipelineForStory = vi.fn(async (story: unknown, deps: unknown) => ({
  jobId: "new-job-id",
  story,
  deps,
}));

vi.mock("../../src/pipeline.js", () => ({
  runPipelineForStory: (story: unknown, deps: unknown) => runPipelineForStory(story, deps),
}));

describe("scripts/regenerate-with-elevenlabs", () => {
  let originalArgv: string[];
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalArgv = process.argv;
    originalEnv = { ...process.env };
    process.env.ELEVENLABS_API_KEY = "test-key";
    process.env.ELEVENLABS_VOICE_ID = "voice-1";
    process.env.PEXELS_API_KEY = "pexels-key";
    process.env.BACKGROUND_SOURCE = "pexels";
    readPendingJob.mockClear();
    ElevenLabsProviderCtor.mockClear();
    QuotaTrackerCtor.mockClear();
    runPipelineForStory.mockClear();
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("regenera a narracao com ElevenLabs para um job existente (fonte pexels)", async () => {
    process.argv = ["node", "regenerate-with-elevenlabs.js", "job-abc"];

    await importScriptAndWait("../../src/scripts/regenerate-with-elevenlabs.js", () => {
      expect(runPipelineForStory).toHaveBeenCalledTimes(1);
    });

    expect(readPendingJob).toHaveBeenCalledWith("job-abc");
    const [story, deps] = runPipelineForStory.mock.calls[0] as [unknown, any];
    expect((story as { id: string }).id).toBe("s1");
    expect(deps.backgroundSource).toBe("pexels");
    expect(deps.pexelsApiKey).toBe("pexels-key");
  });

  it("usa o pack local quando --background-source local e informado", async () => {
    process.argv = [
      "node",
      "regenerate-with-elevenlabs.js",
      "job-abc",
      "--background-source",
      "local",
    ];

    await importScriptAndWait("../../src/scripts/regenerate-with-elevenlabs.js", () => {
      expect(runPipelineForStory).toHaveBeenCalledTimes(1);
    });

    const [, deps] = runPipelineForStory.mock.calls[0] as [unknown, any];
    expect(deps.backgroundSource).toBe("local");
  });

  it("usa --background-query quando informado (fonte pexels)", async () => {
    process.argv = [
      "node",
      "regenerate-with-elevenlabs.js",
      "job-abc",
      "--background-query",
      "gato dormindo",
    ];

    await importScriptAndWait("../../src/scripts/regenerate-with-elevenlabs.js", () => {
      expect(runPipelineForStory).toHaveBeenCalledTimes(1);
    });

    const [, deps] = runPipelineForStory.mock.calls[0] as [unknown, any];
    expect(deps.backgroundQuery).toBe("gato dormindo");
  });

  it("termina com exit code 1 quando --background-query e informado sem valor", async () => {
    process.argv = ["node", "regenerate-with-elevenlabs.js", "job-abc", "--background-query"];
    const exitSpy = mockProcessExit();

    await importScriptAndWait("../../src/scripts/regenerate-with-elevenlabs.js", () => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(runPipelineForStory).not.toHaveBeenCalled();
  });

  it("termina com exit code 1 quando --background-source e informado sem valor", async () => {
    process.argv = ["node", "regenerate-with-elevenlabs.js", "job-abc", "--background-source"];
    const exitSpy = mockProcessExit();

    await importScriptAndWait("../../src/scripts/regenerate-with-elevenlabs.js", () => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(runPipelineForStory).not.toHaveBeenCalled();
  });

  it("termina com exit code 1 quando o jobId esta ausente", async () => {
    process.argv = ["node", "regenerate-with-elevenlabs.js"];
    const exitSpy = mockProcessExit();

    await importScriptAndWait("../../src/scripts/regenerate-with-elevenlabs.js", () => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(readPendingJob).not.toHaveBeenCalled();
  });

  it("termina com exit code 1 quando ELEVENLABS_API_KEY esta ausente", async () => {
    delete process.env.ELEVENLABS_API_KEY;
    process.argv = ["node", "regenerate-with-elevenlabs.js", "job-abc"];
    const exitSpy = mockProcessExit();

    await importScriptAndWait("../../src/scripts/regenerate-with-elevenlabs.js", () => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(runPipelineForStory).not.toHaveBeenCalled();
  });
});
