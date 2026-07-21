import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { ENV } from "../config/index.js";

/**
 * Uso: npm run download:background-pack -- [--url <playlist>] [--output <pasta>] [--limit <n>]
 * Baixa (via yt-dlp) a playlist do YouTube com o pack de videos de fundo,
 * um arquivo mp4 por video, para uso posterior no indexador de cenas.
 * --url (ou env BACKGROUND_PACK_PLAYLIST_URL): URL da playlist.
 * --output (ou env BACKGROUND_PACK_DIR): pasta onde salvar os videos.
 * --limit: baixa so os primeiros N videos da playlist (util para testar antes de baixar tudo).
 */
function getFlag(name: string): string | undefined {
  const args = process.argv.slice(2);
  const flagIndex = args.indexOf(name);
  if (flagIndex === -1) {
    return undefined;
  }
  const value = args[flagIndex + 1];
  if (!value) {
    console.error(`Uso: npm run download:background-pack -- ${name} <valor>`);
    process.exit(1);
  }
  return value;
}

function runYtDlp(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("yt-dlp", args, { stdio: "inherit" });
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(
          new Error(
            "yt-dlp nao encontrado. Instale com: pipx install yt-dlp (ou: pip install -U yt-dlp)"
          )
        );
        return;
      }
      reject(err);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`yt-dlp saiu com codigo ${code}`));
      }
    });
  });
}

async function main() {
  const playlistUrl = getFlag("--url") ?? ENV.BACKGROUND_PACK_PLAYLIST_URL;
  const outputDir = getFlag("--output") ?? ENV.BACKGROUND_PACK_DIR;
  const limitFlag = getFlag("--limit");

  if (!playlistUrl) {
    console.error(
      "Informe a URL da playlist via --url ou env BACKGROUND_PACK_PLAYLIST_URL."
    );
    process.exit(1);
  }

  let limit: number | undefined;
  if (limitFlag !== undefined) {
    limit = Number.parseInt(limitFlag, 10);
    if (!Number.isInteger(limit) || limit <= 0) {
      console.error(`--limit deve ser um numero inteiro positivo, recebido: ${limitFlag}`);
      process.exit(1);
    }
  }

  await mkdir(outputDir, { recursive: true });

  console.log(
    `Baixando playlist em ${outputDir}${limit ? ` (limitado aos primeiros ${limit} videos)` : ""} ...`
  );
  await runYtDlp([
    "-f",
    "bv*[ext=mp4]+ba[ext=m4a]/mp4",
    ...(limit ? ["--playlist-items", `1-${limit}`] : []),
    "-o",
    `${outputDir}/%(playlist_index)s - %(title)s.%(ext)s`,
    playlistUrl,
  ]);

  console.log("Download concluido.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
