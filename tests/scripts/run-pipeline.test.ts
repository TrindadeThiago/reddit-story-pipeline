import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importScriptAndWait, mockProcessExit } from "../helpers/cli.js";
import { withTempDir } from "../helpers/tempDir.js";

vi.mock("dotenv/config", () => ({}));

const fetchStories = vi.fn(async (_opts: unknown) => [
  { id: "s1", subreddit: "AskHistorians", title: "t", body: "b", url: "u", score: 900 },
]);

vi.mock("../../src/modules/reddit/index.js", () => ({
  fetchStories: (opts: unknown) => fetchStories(opts),
}));

vi.mock("../../src/modules/tts/index.js", () => ({
  PiperProvider: function (this: unknown, ...args: unknown[]) {
    return { name: "piper", args };
  },
}));

const runPipelineForStory = vi.fn(async (story: unknown, deps: unknown) => ({
  jobId: `job-${(story as { id: string }).id}`,
  story,
  deps,
}));

vi.mock("../../src/pipeline.js", () => ({
  runPipelineForStory: (story: unknown, deps: unknown) => runPipelineForStory(story, deps),
}));

describe("scripts/run-pipeline", () => {
  let originalArgv: string[];
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalArgv = process.argv;
    originalEnv = { ...process.env };
    process.env.PIPER_MODEL_PATH = "/models/piper.onnx";
    process.env.BACKGROUND_SOURCE = "pexels";
    process.env.PEXELS_API_KEY = "pexels-key";
    fetchStories.mockClear();
    runPipelineForStory.mockClear();
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("busca historias no Reddit quando --input nao e informado", async () => {
    process.argv = ["node", "run-pipeline.js"];

    await importScriptAndWait("../../src/scripts/run-pipeline.js", () => {
      expect(runPipelineForStory).toHaveBeenCalledTimes(1);
    });

    expect(fetchStories).toHaveBeenCalledTimes(1);
  });

  it("le historias de --input em vez de buscar no Reddit", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        join(dir, "story-a.json"),
        JSON.stringify({ id: "a", subreddit: "x", title: "t", body: "b", url: "u", score: 1 })
      );
      await writeFile(
        join(dir, "story-b.json"),
        JSON.stringify({ id: "b", subreddit: "x", title: "t2", body: "b2", url: "u2", score: 2 })
      );

      process.argv = ["node", "run-pipeline.js", "--input", dir];

      await importScriptAndWait("../../src/scripts/run-pipeline.js", () => {
        expect(runPipelineForStory).toHaveBeenCalledTimes(2);
      });

      expect(fetchStories).not.toHaveBeenCalled();
    });
  });

  it("filtra uma unica historia com --story", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        join(dir, "story-a.json"),
        JSON.stringify({ id: "a", subreddit: "x", title: "t", body: "b", url: "u", score: 1 })
      );
      await writeFile(
        join(dir, "story-b.json"),
        JSON.stringify({ id: "b", subreddit: "x", title: "t2", body: "b2", url: "u2", score: 2 })
      );

      process.argv = ["node", "run-pipeline.js", "--input", dir, "--story", "b"];

      await importScriptAndWait("../../src/scripts/run-pipeline.js", () => {
        expect(runPipelineForStory).toHaveBeenCalledTimes(1);
      });

      const [story] = runPipelineForStory.mock.calls[0] as [{ id: string }, unknown];
      expect(story.id).toBe("b");
    });
  });

  it("usa --background-query e --background-source quando informados", async () => {
    process.argv = [
      "node",
      "run-pipeline.js",
      "--background-source",
      "pexels",
      "--background-query",
      "gato dormindo",
    ];

    await importScriptAndWait("../../src/scripts/run-pipeline.js", () => {
      expect(runPipelineForStory).toHaveBeenCalledTimes(1);
    });

    const [, deps] = runPipelineForStory.mock.calls[0] as [unknown, any];
    expect(deps.backgroundQuery).toBe("gato dormindo");
    expect(deps.backgroundSource).toBe("pexels");
  });

  it("usa o pack local quando --background-source local e informado", async () => {
    process.env.BACKGROUND_PACK_DIR = "storage/background-pack";
    process.env.BACKGROUND_PACK_INDEX_PATH = "storage/background-pack/index.json";
    process.argv = ["node", "run-pipeline.js", "--background-source", "local"];

    await importScriptAndWait("../../src/scripts/run-pipeline.js", () => {
      expect(runPipelineForStory).toHaveBeenCalledTimes(1);
    });

    const [, deps] = runPipelineForStory.mock.calls[0] as [unknown, any];
    expect(deps.backgroundSource).toBe("local");
    expect(deps.backgroundPackDir).toBe("storage/background-pack");
  });

  it("termina com exit code 1 quando um arquivo de historia contem um array em vez de um objeto", async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, "story-array.json"), JSON.stringify([{ id: "a" }]));
      process.argv = ["node", "run-pipeline.js", "--input", dir];
      const exitSpy = mockProcessExit();

      await importScriptAndWait("../../src/scripts/run-pipeline.js", () => {
        expect(exitSpy).toHaveBeenCalledWith(1);
      });

      expect(runPipelineForStory).not.toHaveBeenCalled();
    });
  });

  it("termina com exit code 1 quando um arquivo de historia manual esta sem o campo body", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        join(dir, "story-incompleta.json"),
        JSON.stringify({ id: "a", subreddit: "x", title: "t", url: "u", score: 1 })
      );
      process.argv = ["node", "run-pipeline.js", "--input", dir];
      const exitSpy = mockProcessExit();

      await importScriptAndWait("../../src/scripts/run-pipeline.js", () => {
        expect(exitSpy).toHaveBeenCalledWith(1);
      });

      expect(runPipelineForStory).not.toHaveBeenCalled();
    });
  });

  it("termina com exit code 1 quando --story nao corresponde a nenhuma historia", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        join(dir, "story-a.json"),
        JSON.stringify({ id: "a", subreddit: "x", title: "t", body: "b", url: "u", score: 1 })
      );
      process.argv = ["node", "run-pipeline.js", "--input", dir, "--story", "nao-existe"];
      const exitSpy = mockProcessExit();

      await importScriptAndWait("../../src/scripts/run-pipeline.js", () => {
        expect(exitSpy).toHaveBeenCalledWith(1);
      });

      expect(runPipelineForStory).not.toHaveBeenCalled();
    });
  });

  it("termina com exit code 1 quando --story e informado sem valor", async () => {
    await withTempDir(async (dir) => {
      process.argv = ["node", "run-pipeline.js", "--input", dir, "--story"];
      const exitSpy = mockProcessExit();

      await importScriptAndWait("../../src/scripts/run-pipeline.js", () => {
        expect(exitSpy).toHaveBeenCalledWith(1);
      });

      expect(runPipelineForStory).not.toHaveBeenCalled();
    });
  });

  it("termina com exit code 1 quando --background-query e informado sem valor", async () => {
    process.argv = ["node", "run-pipeline.js", "--background-query"];
    const exitSpy = mockProcessExit();

    await importScriptAndWait("../../src/scripts/run-pipeline.js", () => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(runPipelineForStory).not.toHaveBeenCalled();
  });

  it("termina com exit code 1 quando --background-source e informado sem valor", async () => {
    process.argv = ["node", "run-pipeline.js", "--background-source"];
    const exitSpy = mockProcessExit();

    await importScriptAndWait("../../src/scripts/run-pipeline.js", () => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(runPipelineForStory).not.toHaveBeenCalled();
  });

  it("termina com exit code 1 quando --input e informado sem valor", async () => {
    process.argv = ["node", "run-pipeline.js", "--input"];
    const exitSpy = mockProcessExit();

    await importScriptAndWait("../../src/scripts/run-pipeline.js", () => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(fetchStories).not.toHaveBeenCalled();
  });

  it("termina com exit code 1 quando PIPER_MODEL_PATH esta ausente", async () => {
    delete process.env.PIPER_MODEL_PATH;
    process.argv = ["node", "run-pipeline.js"];
    const exitSpy = mockProcessExit();

    await importScriptAndWait("../../src/scripts/run-pipeline.js", () => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(fetchStories).not.toHaveBeenCalled();
  });
});
