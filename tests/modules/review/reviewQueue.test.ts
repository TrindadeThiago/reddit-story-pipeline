import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mkdirCalls: Array<{ path: string }> = [];
const renameCalls: Array<{ from: string; to: string }> = [];
const writtenFiles = new Map<string, string>();

const mkdir = vi.fn(async (path: string, _opts?: unknown) => {
  mkdirCalls.push({ path });
});
const writeFile = vi.fn(async (path: string, data: string) => {
  writtenFiles.set(path, data);
});
const readFile = vi.fn(async (path: string, _encoding: string) => {
  const content = writtenFiles.get(path);
  if (content === undefined) {
    throw Object.assign(new Error(`ENOENT: ${path}`), { code: "ENOENT" });
  }
  return content;
});
const rename = vi.fn(async (from: string, to: string) => {
  renameCalls.push({ from, to });
  const content = writtenFiles.get(join(from, "job.json"));
  if (content !== undefined) {
    writtenFiles.delete(join(from, "job.json"));
    writtenFiles.set(join(to, "job.json"), content);
  }
});

vi.mock("node:fs/promises", () => ({
  mkdir: (path: string, opts?: unknown) => mkdir(path, opts),
  writeFile: (path: string, data: string) => writeFile(path, data),
  readFile: (path: string, encoding: string) => readFile(path, encoding),
  rename: (from: string, to: string) => rename(from, to),
}));

const job = {
  jobId: "story-1-12345",
  story: { id: "story-1", subreddit: "AskHistorians", title: "t", body: "b", url: "u", score: 1 },
};

describe("reviewQueue", () => {
  beforeEach(() => {
    mkdirCalls.length = 0;
    renameCalls.length = 0;
    writtenFiles.clear();
    mkdir.mockClear();
    writeFile.mockClear();
    readFile.mockClear();
    rename.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enfileira um job criando a pasta em pending-review e gravando job.json", async () => {
    const { enqueueForReview } = await import("../../../src/modules/review/reviewQueue.js");

    const jobDir = await enqueueForReview(job);

    expect(jobDir).toBe(join("storage/pending-review", job.jobId));
    expect(mkdirCalls[0].path).toBe(join("storage/pending-review", job.jobId));
    expect(writtenFiles.get(join("storage/pending-review", job.jobId, "job.json"))).toBe(
      JSON.stringify(job, null, 2)
    );
  });

  it("le um job pendente pelo jobId", async () => {
    const { enqueueForReview, readPendingJob } = await import(
      "../../../src/modules/review/reviewQueue.js"
    );
    await enqueueForReview(job);

    const loaded = await readPendingJob(job.jobId);

    expect(loaded).toEqual(job);
  });

  it("move um job de pending-review para approved e depois para published", async () => {
    const { enqueueForReview, moveToApproved, moveToPublished } = await import(
      "../../../src/modules/review/reviewQueue.js"
    );
    await enqueueForReview(job);

    await moveToApproved(job.jobId);
    expect(renameCalls[0]).toEqual({
      from: join("storage/pending-review", job.jobId),
      to: join("storage/approved", job.jobId),
    });

    await moveToPublished(job.jobId);
    expect(renameCalls[1]).toEqual({
      from: join("storage/approved", job.jobId),
      to: join("storage/published", job.jobId),
    });
  });

  it("move um job de pending-review diretamente para discarded", async () => {
    const { enqueueForReview, moveToDiscarded } = await import(
      "../../../src/modules/review/reviewQueue.js"
    );
    await enqueueForReview(job);

    await moveToDiscarded(job.jobId);

    expect(renameCalls[0]).toEqual({
      from: join("storage/pending-review", job.jobId),
      to: join("storage/discarded", job.jobId),
    });
  });

  it("propaga erro ao tentar ler um job pendente que nao existe", async () => {
    const { readPendingJob } = await import("../../../src/modules/review/reviewQueue.js");

    await expect(readPendingJob("job-inexistente")).rejects.toThrow(/ENOENT/);
  });
});
