import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuotaTracker } from "../../../src/modules/tts/quotaTracker.js";
import { withTempDir } from "../../helpers/tempDir.js";

describe("QuotaTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite uso dentro do limite mensal e persiste o estado apos recordUsage", async () => {
    await withTempDir(async (dir) => {
      const statePath = join(dir, "nested", "quota.json");
      const tracker = new QuotaTracker(statePath, 1000);

      await tracker.assertHasBudget(500);
      await tracker.recordUsage(500);

      const raw = await readFile(statePath, "utf-8");
      const state = JSON.parse(raw);
      expect(state.charactersUsed).toBe(500);
      expect(state.yearMonth).toBe("2026-07");
    });
  });

  it("lanca erro quando o uso adicional estouraria o limite mensal", async () => {
    await withTempDir(async (dir) => {
      const statePath = join(dir, "quota.json");
      const tracker = new QuotaTracker(statePath, 1000);

      await tracker.recordUsage(900);

      await expect(tracker.assertHasBudget(200)).rejects.toThrow(
        /Cota mensal do ElevenLabs estourada/
      );
    });
  });

  it("reseta o contador quando o mes muda em relacao ao estado salvo", async () => {
    await withTempDir(async (dir) => {
      const statePath = join(dir, "quota.json");
      const tracker = new QuotaTracker(statePath, 1000);

      await tracker.recordUsage(900);

      vi.setSystemTime(new Date("2026-08-02T12:00:00Z"));

      await expect(tracker.assertHasBudget(950)).resolves.toBeUndefined();
    });
  });

  it("trata estado ausente/corrompido como uso zero no mes corrente", async () => {
    await withTempDir(async (dir) => {
      const statePath = join(dir, "nao-existe", "quota.json");
      const tracker = new QuotaTracker(statePath, 1000);

      await expect(tracker.assertHasBudget(999)).resolves.toBeUndefined();
    });
  });

  it("lanca erro na construcao quando o limite mensal e NaN", async () => {
    await withTempDir(async (dir) => {
      const statePath = join(dir, "quota.json");
      expect(() => new QuotaTracker(statePath, Number("abc"))).toThrow(
        /Limite mensal de cota invalido/
      );
    });
  });

  it("lanca erro na construcao quando o limite mensal e zero", async () => {
    await withTempDir(async (dir) => {
      const statePath = join(dir, "quota.json");
      expect(() => new QuotaTracker(statePath, 0)).toThrow(
        /Limite mensal de cota invalido/
      );
    });
  });

  it("lanca erro na construcao quando o limite mensal e negativo", async () => {
    await withTempDir(async (dir) => {
      const statePath = join(dir, "quota.json");
      expect(() => new QuotaTracker(statePath, -500)).toThrow(
        /Limite mensal de cota invalido/
      );
    });
  });
});
