import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buildHighlightedAss } from "../../../src/modules/captions/buildHighlightedAss.js";
import { withTempDir } from "../../helpers/tempDir.js";
import type { CaptionWord } from "../../../src/types.js";

describe("buildHighlightedAss", () => {
  it("gera um .ass com cabecalho valido e uma linha Dialogue por palavra", async () => {
    await withTempDir(async (dir) => {
      const words: CaptionWord[] = [
        { word: "Ola", startSeconds: 0, endSeconds: 0.4 },
        { word: "mundo", startSeconds: 0.4, endSeconds: 0.8 },
      ];
      const outputPath = join(dir, "out.ass");

      await buildHighlightedAss(words, outputPath);

      const content = await readFile(outputPath, "utf-8");
      expect(content).toContain("[Script Info]");
      expect(content).toContain("[V4+ Styles]");
      expect(content).toContain("[Events]");
      const dialogueLines = content.split("\n").filter((l) => l.startsWith("Dialogue:"));
      expect(dialogueLines).toHaveLength(2);
      expect(dialogueLines[0]).toContain("Ola");
      expect(dialogueLines[1]).toContain("mundo");
    });
  });

  it("destaca a palavra ativa com a cor de highlight e mantem as demais na cor base, dentro da mesma linha", async () => {
    await withTempDir(async (dir) => {
      const words: CaptionWord[] = [
        { word: "um", startSeconds: 0, endSeconds: 0.2 },
        { word: "dois", startSeconds: 0.2, endSeconds: 0.4 },
        { word: "tres", startSeconds: 0.4, endSeconds: 0.6 },
        { word: "quatro", startSeconds: 0.6, endSeconds: 0.8 },
      ];
      const outputPath = join(dir, "out.ass");

      await buildHighlightedAss(words, outputPath);

      const content = await readFile(outputPath, "utf-8");
      const dialogueLines = content.split("\n").filter((l) => l.startsWith("Dialogue:"));
      expect(dialogueLines).toHaveLength(4);
      // primeira linha: "um" ativo, os demais aparecem sem marcador de cor
      expect(dialogueLines[0]).toContain("{\\c&H00D7FF&}um{\\c&HFFFFFF&} dois tres quatro");
    });
  });

  it("funde palavras em blocos de 4 (WORDS_PER_LINE) quando ha mais de 4 palavras", async () => {
    await withTempDir(async (dir) => {
      const words: CaptionWord[] = Array.from({ length: 5 }, (_, i) => ({
        word: `p${i}`,
        startSeconds: i * 0.2,
        endSeconds: i * 0.2 + 0.2,
      }));
      const outputPath = join(dir, "out.ass");

      await buildHighlightedAss(words, outputPath);

      const content = await readFile(outputPath, "utf-8");
      const dialogueLines = content.split("\n").filter((l) => l.startsWith("Dialogue:"));
      // 4 palavras na primeira "tela" + 1 na segunda = 5 linhas de Dialogue
      expect(dialogueLines).toHaveLength(5);
      // a 5a palavra (p4) esta sozinha na segunda tela
      expect(dialogueLines[4]).toContain("p4");
      expect(dialogueLines[4]).not.toContain("p0");
    });
  });

  it("lida com lista vazia de palavras sem lancar erro", async () => {
    await withTempDir(async (dir) => {
      const outputPath = join(dir, "empty.ass");
      await buildHighlightedAss([], outputPath);
      const content = await readFile(outputPath, "utf-8");
      expect(content).toContain("[Events]");
      expect(content.split("\n").filter((l) => l.startsWith("Dialogue:"))).toHaveLength(0);
    });
  });
});
