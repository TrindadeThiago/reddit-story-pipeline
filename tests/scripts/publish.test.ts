import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importScriptAndWait, mockProcessExit } from "../helpers/cli.js";

const moveToApproved = vi.fn(async (_jobId: string) => {});
const moveToPublished = vi.fn(async (_jobId: string) => {});

vi.mock("../../src/modules/review/index.js", () => ({
  moveToApproved: (jobId: string) => moveToApproved(jobId),
  moveToPublished: (jobId: string) => moveToPublished(jobId),
}));

describe("scripts/publish", () => {
  let originalArgv: string[];

  beforeEach(() => {
    originalArgv = process.argv;
    moveToApproved.mockClear();
    moveToPublished.mockClear();
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("move o job para approved e depois published quando um jobId e informado", async () => {
    process.argv = ["node", "publish.js", "job-123"];

    await importScriptAndWait("../../src/scripts/publish.js", () => {
      expect(moveToPublished).toHaveBeenCalledWith("job-123");
    });

    expect(moveToApproved).toHaveBeenCalledWith("job-123");
  });

  it("termina com exit code 1 e nao move nada quando o jobId esta ausente", async () => {
    process.argv = ["node", "publish.js"];
    const exitSpy = mockProcessExit();

    await importScriptAndWait("../../src/scripts/publish.js", () => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(moveToApproved).not.toHaveBeenCalled();
    expect(moveToPublished).not.toHaveBeenCalled();
  });

  it("reporta exit code 1 quando moveToApproved falha", async () => {
    process.argv = ["node", "publish.js", "job-err"];
    moveToApproved.mockRejectedValueOnce(new Error("disco cheio"));
    const exitSpy = mockProcessExit();

    await importScriptAndWait("../../src/scripts/publish.js", () => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(moveToPublished).not.toHaveBeenCalled();
  });

  it("termina com exit code 1 e nao move nada quando o jobId e malicioso", async () => {
    process.argv = ["node", "publish.js", "../../etc/passwd"];
    const exitSpy = mockProcessExit();

    await importScriptAndWait("../../src/scripts/publish.js", () => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(moveToApproved).not.toHaveBeenCalled();
    expect(moveToPublished).not.toHaveBeenCalled();
  });
});
