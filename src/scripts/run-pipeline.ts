import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fetchStories } from "../modules/reddit/fetchStories.js";
import { PiperProvider } from "../modules/tts/piperProvider.js";
import { runPipelineForStory } from "../pipeline.js";
import type { RedditStory } from "../types.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Variavel de ambiente obrigatoria ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

/**
 * Uso: npm run generate -- --input caminho/para/historias.json
 * Le historias inseridas manualmente (mesmo formato de RedditStory) em vez
 * de buscar no Reddit -- util quando a autenticacao/OAuth nao esta disponivel.
 */
async function loadStoriesFromFile(filePath: string): Promise<RedditStory[]> {
  const raw = await readFile(filePath, "utf-8");
  const stories = JSON.parse(raw) as RedditStory[];
  if (!Array.isArray(stories)) {
    throw new Error(`Arquivo de historias manuais deve conter um array JSON: ${filePath}`);
  }
  return stories;
}

function getInputFlag(): string | undefined {
  const args = process.argv.slice(2);
  const flagIndex = args.indexOf("--input");
  if (flagIndex === -1) {
    return undefined;
  }
  const value = args[flagIndex + 1];
  if (!value) {
    console.error("Uso: npm run generate -- --input <arquivo.json>");
    process.exit(1);
  }
  return value;
}

async function main() {
  const piperModelPath = requireEnv("PIPER_MODEL_PATH");
  const pexelsApiKey = requireEnv("PEXELS_API_KEY");

  const inputFile = getInputFlag();

  const stories = inputFile
    ? await loadStoriesFromFile(inputFile)
    : await fetchStories({
        subreddits: ["AskHistorians"],
        minScore: 500,
        minBodyLength: 800,
        limit: 5,
      });

  const piper = new PiperProvider(piperModelPath);

  console.log(`Encontradas ${stories.length} historias. Gerando com Piper...`);

  for (const story of stories) {
    const job = await runPipelineForStory(story, {
      ttsProvider: piper,
      pexelsApiKey,
      whisperModelSize: process.env.WHISPER_MODEL_SIZE ?? "base",
      backgroundQuery: "pessoa organizando", // TODO: variar/parametrizar
    });
    console.log(`Job pronto para revisao: ${job.jobId}`);
  }

  console.log("Abra storage/pending-review para revisar os videos.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
