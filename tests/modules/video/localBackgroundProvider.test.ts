import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withTempDir } from "../../helpers/tempDir.js";
import type { BackgroundPackIndex } from "../../../src/types.js";
import { pickClips, selectLocalBackgroundClips } from "../../../src/modules/video/localBackgroundProvider.js";

describe("pickClips", () => {
  it("seleciona clipes suficientes para cobrir a duracao alvo + margem", () => {
    const index: BackgroundPackIndex = {
      generatedAt: "2026-07-21T00:00:00.000Z",
      files: [
        { fileName: "a.mp4", durationSeconds: 20, clips: [{ startSeconds: 0, endSeconds: 10 }, { startSeconds: 10, endSeconds: 20 }] },
        { fileName: "b.mp4", durationSeconds: 15, clips: [{ startSeconds: 0, endSeconds: 15 }] },
      ],
    };

    // duracao alvo (5s) + margem (2s) = 7s; o menor clipe unico ja cobre isso,
    // entao pelo menos 1 clipe deve ter sido selecionado
    const clips = pickClips(index, 5);
    expect(clips.length).toBeGreaterThanOrEqual(1);
    const total = clips.reduce((sum, c) => sum + c.durationSeconds, 0);
    expect(total).toBeGreaterThanOrEqual(7);
  });

  it("continua sorteando clipes ate somar a duracao alvo quando um unico clipe nao e suficiente", () => {
    const index: BackgroundPackIndex = {
      generatedAt: "2026-07-21T00:00:00.000Z",
      files: [
        {
          fileName: "a.mp4",
          durationSeconds: 3,
          clips: [
            { startSeconds: 0, endSeconds: 1 },
            { startSeconds: 1, endSeconds: 2 },
            { startSeconds: 2, endSeconds: 3 },
          ],
        },
      ],
    };

    // alvo (5s) + margem (2s) = 7s, mas o pack so tem 3s de clipes por
    // volta -- precisa reembaralhar/repetir mais de uma vez para fechar o total
    const clips = pickClips(index, 5);
    expect(clips.length).toBeGreaterThan(3);
  });

  it("lanca erro quando o indice nao tem nenhum clipe", () => {
    const index: BackgroundPackIndex = { generatedAt: "2026-07-21T00:00:00.000Z", files: [] };

    expect(() => pickClips(index, 5)).toThrow("Pack de videos de fundo nao tem nenhum clipe indexado.");
  });

  it("lanca erro (em vez de loop infinito) quando todos os clipes indexados tem duracao zero", () => {
    const index: BackgroundPackIndex = {
      generatedAt: "2026-07-21T00:00:00.000Z",
      files: [{ fileName: "a.mp4", durationSeconds: 0, clips: [{ startSeconds: 5, endSeconds: 5 }] }],
    };

    expect(() => pickClips(index, 5)).toThrow(/clipes de duracao zero/);
  });
});

describe("selectLocalBackgroundClips", () => {
  it("le o indice do disco e seleciona clipes cobrindo a duracao alvo", async () => {
    await withTempDir(async (dir) => {
      const index: BackgroundPackIndex = {
        generatedAt: "2026-07-21T00:00:00.000Z",
        files: [{ fileName: "a.mp4", durationSeconds: 20, clips: [{ startSeconds: 0, endSeconds: 20 }] }],
      };
      const indexPath = join(dir, "index.json");
      await writeFile(indexPath, JSON.stringify(index));

      const clips = await selectLocalBackgroundClips(indexPath, 5);

      expect(clips.length).toBeGreaterThanOrEqual(1);
      expect(clips[0].fileName).toBe("a.mp4");
    });
  });
});
