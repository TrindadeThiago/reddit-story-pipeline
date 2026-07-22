import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importScriptAndWait, mockProcessExit } from "../helpers/cli.js";

const moveToDiscarded = vi.fn(async (_jobId: string) => {});

vi.mock("../../src/modules/review/index.js", () => ({
  moveToDiscarded: (jobId: string) => moveToDiscarded(jobId),
}));

describe("scripts/discard", () => {
  let originalArgv: string[];

  beforeEach(() => {
    originalArgv = process.argv;
    moveToDiscarded.mockClear();
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("move o job para discarded quando um jobId e informado", async () => {
    process.argv = ["node", "discard.js", "job-456"];

    await importScriptAndWait("../../src/scripts/discard.js", () => {
      expect(moveToDiscarded).toHaveBeenCalledWith("job-456");
    });
  });

  it("termina com exit code 1 e nao move nada quando o jobId esta ausente", async () => {
    process.argv = ["node", "discard.js"];
    const exitSpy = mockProcessExit();

    await importScriptAndWait("../../src/scripts/discard.js", () => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(moveToDiscarded).not.toHaveBeenCalled();
  });
});
