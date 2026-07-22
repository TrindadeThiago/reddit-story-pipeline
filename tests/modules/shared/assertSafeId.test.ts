import { describe, expect, it } from "vitest";
import { assertSafeId } from "../../../src/modules/shared/assertSafeId.js";

describe("assertSafeId", () => {
  it("aceita ids alfanumericos com hifen e underscore", () => {
    expect(() => assertSafeId("abc123-story_1", "jobId")).not.toThrow();
  });

  it("rejeita ids com sequencia de path traversal", () => {
    expect(() => assertSafeId("../../etc/passwd", "jobId")).toThrow(
      /jobId invalido/
    );
  });

  it("rejeita ids com barra", () => {
    expect(() => assertSafeId("foo/bar", "jobId")).toThrow(/jobId invalido/);
  });

  it("rejeita ids com espaco", () => {
    expect(() => assertSafeId("job 123", "jobId")).toThrow(/jobId invalido/);
  });

  it("rejeita id vazio", () => {
    expect(() => assertSafeId("", "jobId")).toThrow(/jobId invalido/);
  });

  it("rejeita caracteres de filtergraph do ffmpeg", () => {
    for (const bad of ["job:1", "job'1", "job,1", "job[1]"]) {
      expect(() => assertSafeId(bad, "jobId")).toThrow(/jobId invalido/);
    }
  });

  it("inclui o campo informado na mensagem de erro", () => {
    expect(() => assertSafeId("../x", "story.id")).toThrow(/story\.id invalido/);
  });
});
