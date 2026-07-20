import { writeFile } from "node:fs/promises";
import type { CaptionWord } from "../../types.js";

const WORDS_PER_LINE = 4;
const HIGHLIGHT_COLOR = "&H00D7FF&"; // ASS usa BGR: amarelo/laranja vibrante
const BASE_COLOR = "&HFFFFFF&"; // branco

function formatAssTimestamp(seconds: number): string {
  const totalCentis = Math.round(seconds * 100);
  const hours = Math.floor(totalCentis / 360000);
  const minutes = Math.floor((totalCentis % 360000) / 6000);
  const secs = Math.floor((totalCentis % 6000) / 100);
  const centis = totalCentis % 100;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(
    centis
  ).padStart(2, "0")}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Gera um .ass com uma linha de Dialogue por palavra falada: a palavra ativa
 * fica destacada (highlight) enquanto as demais da mesma "tela" ficam na cor
 * base -- estilo usado em legendas de video curto (Reels/TikTok/Shorts).
 */
export async function buildHighlightedAss(
  words: CaptionWord[],
  outputPath: string
): Promise<void> {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,90,${BASE_COLOR},${BASE_COLOR},&H000000&,&H00000000&,1,0,0,0,100,100,0,0,1,6,0,2,80,80,220,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const lines: string[] = [];

  for (const line of chunk(words, WORDS_PER_LINE)) {
    for (let activeIndex = 0; activeIndex < line.length; activeIndex++) {
      const active = line[activeIndex];
      const nextWord = line[activeIndex + 1];

      const start = active.startSeconds;
      // evita "piscar" no intervalo de silencio entre palavras da mesma linha
      const end = nextWord ? nextWord.startSeconds : active.endSeconds;

      const text = line
        .map((word, index) =>
          index === activeIndex
            ? `{\\c${HIGHLIGHT_COLOR}}${word.word}{\\c${BASE_COLOR}}`
            : word.word
        )
        .join(" ");

      lines.push(
        `Dialogue: 0,${formatAssTimestamp(start)},${formatAssTimestamp(end)},Default,,0,0,0,,${text}`
      );
    }
  }

  await writeFile(outputPath, header + lines.join("\n") + "\n");
}
