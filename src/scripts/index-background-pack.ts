import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ENV } from "../config/index.js";
import { indexBackgroundPack } from "../modules/video/index.js";

/**
 * Uso: yarn index:background-pack [--dir <pasta>] [--output <arquivo.json>]
 *      [--threshold <0-1>] [--min-clip-seconds <segundos>]
 * Roda deteccao de cena (ffmpeg) em cada video da pasta do pack (baixada via
 * download:background-pack) e gera um JSON com os intervalos de cada trecho
 * curto, para o provider local escolher clipes inteiros sem cortar no meio.
 * --dir (ou env BACKGROUND_PACK_DIR): pasta com os videos do pack.
 * --output: caminho do JSON de saida (padrao: <dir>/index.json).
 * --threshold: sensibilidade da deteccao de corte de cena (padrao 0.3; menor = mais cortes).
 * --min-clip-seconds: funde clipes menores que isso com o vizinho (padrao 1.5).
 */
function getFlag(name: string): string | undefined {
  const args = process.argv.slice(2);
  const flagIndex = args.indexOf(name);
  if (flagIndex === -1) {
    return undefined;
  }
  const value = args[flagIndex + 1];
  if (!value) {
    console.error(`Uso: yarn index:background-pack ${name} <valor>`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const dir = getFlag("--dir") ?? ENV.BACKGROUND_PACK_DIR;
  const output = getFlag("--output") ?? join(dir, "index.json");
  const thresholdFlag = getFlag("--threshold");
  const minClipSecondsFlag = getFlag("--min-clip-seconds");

  console.log(`Indexando cenas dos videos em ${dir} ...`);
  const index = await indexBackgroundPack(dir, {
    sceneThreshold: thresholdFlag ? Number.parseFloat(thresholdFlag) : undefined,
    minClipSeconds: minClipSecondsFlag ? Number.parseFloat(minClipSecondsFlag) : undefined,
  });

  await writeFile(output, JSON.stringify(index, null, 2), "utf-8");

  const totalClips = index.files.reduce((sum, f) => sum + f.clips.length, 0);
  console.log(
    `Indice gerado em ${output}: ${index.files.length} video(s), ${totalClips} clipe(s) no total.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
