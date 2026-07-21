import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { ENV } from "../config/index.js";
import { fetchStories } from "../modules/reddit/index.js";
import { PiperProvider } from "../modules/tts/index.js";
import { runPipelineForStory } from "../pipeline.js";
import type { RedditStory } from "../types.js";

function requireEnv<K extends keyof typeof ENV>(name: K): string {
  const value = ENV[name];
  if (!value) {
    console.error(`Variavel de ambiente obrigatoria ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

/**
 * Uso: npm run generate -- --input caminho/para/pasta [--story <id-ou-arquivo>] --background-query "termo de busca"
 * --input: le historias inseridas manualmente (uma por arquivo .json, mesmo formato de
 * RedditStory) a partir de uma pasta, em vez de buscar no Reddit -- util quando a
 * autenticacao/OAuth nao esta disponivel.
 * --story: filtra uma unica historia dentro da pasta de --input, pelo campo "id" ou pelo
 * nome do arquivo (com ou sem .json). Sem essa flag, todas as historias da pasta sao geradas.
 * --background-query (ou env BACKGROUND_QUERY): termo usado na busca do video de fundo no Pexels.
 * --background-source (ou env BACKGROUND_SOURCE): "pexels" (padrao) ou "local" (usa o pack
 * indexado por index:background-pack em vez de buscar no Pexels).
 */
async function loadStoriesFromDirectory(
  dirPath: string,
  storyFilter?: string
): Promise<RedditStory[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && extname(entry.name) === ".json")
    .map((entry) => entry.name)
    .sort();

  const stories: RedditStory[] = [];
  for (const fileName of jsonFiles) {
    const filePath = join(dirPath, fileName);
    const raw = await readFile(filePath, "utf-8");
    const story = JSON.parse(raw) as RedditStory;
    if (Array.isArray(story)) {
      throw new Error(
        `Arquivo de historia manual deve conter um unico objeto JSON, nao um array: ${filePath}`
      );
    }
    stories.push(story);
  }

  if (!storyFilter) {
    return stories;
  }

  const normalizedFilter = storyFilter.replace(/\.json$/i, "");
  const filtered = stories.filter(
    (story, index) =>
      story.id === storyFilter ||
      story.id === normalizedFilter ||
      jsonFiles[index].replace(/\.json$/i, "") === normalizedFilter
  );

  if (filtered.length === 0) {
    throw new Error(
      `Nenhuma historia encontrada em ${dirPath} com id ou arquivo correspondente a "${storyFilter}"`
    );
  }

  return filtered;
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

function getStoryFlag(): string | undefined {
  const args = process.argv.slice(2);
  const flagIndex = args.indexOf("--story");
  if (flagIndex === -1) {
    return undefined;
  }
  const value = args[flagIndex + 1];
  if (!value) {
    console.error("Uso: npm run generate -- --input <pasta> --story <id-ou-arquivo>");
    process.exit(1);
  }
  return value;
}

function getBackgroundQueryFlag(): string | undefined {
  const args = process.argv.slice(2);
  const flagIndex = args.indexOf("--background-query");
  if (flagIndex === -1) {
    return undefined;
  }
  const value = args[flagIndex + 1];
  if (!value) {
    console.error("Uso: npm run generate -- --background-query <termo de busca>");
    process.exit(1);
  }
  return value;
}

function getBackgroundSourceFlag(): string | undefined {
  const args = process.argv.slice(2);
  const flagIndex = args.indexOf("--background-source");
  if (flagIndex === -1) {
    return undefined;
  }
  const value = args[flagIndex + 1];
  if (!value) {
    console.error("Uso: npm run generate -- --background-source <pexels|local>");
    process.exit(1);
  }
  return value;
}

async function main() {
  const piperModelPath = requireEnv("PIPER_MODEL_PATH");
  const backgroundSource = getBackgroundSourceFlag() ?? ENV.BACKGROUND_SOURCE;

  const inputFile = getInputFlag();
  const storyFilter = getStoryFlag();

  const stories = inputFile
    ? await loadStoriesFromDirectory(inputFile, storyFilter)
    : await fetchStories({
        subreddits: ["AskHistorians"],
        minScore: 500,
        minBodyLength: 800,
        limit: 5,
      });

  const piper = new PiperProvider(piperModelPath, ENV.PIPER_LENGTH_SCALE);

  const backgroundDeps =
    backgroundSource === "local"
      ? {
          backgroundSource: "local" as const,
          backgroundPackDir: ENV.BACKGROUND_PACK_DIR,
          backgroundPackIndexPath: ENV.BACKGROUND_PACK_INDEX_PATH,
        }
      : {
          backgroundSource: "pexels" as const,
          pexelsApiKey: requireEnv("PEXELS_API_KEY"),
          pexelsApiUrl: ENV.PEXELS_API_URL,
          backgroundQuery: getBackgroundQueryFlag() ?? ENV.BACKGROUND_QUERY,
        };

  console.log(`Encontradas ${stories.length} historias. Gerando com Piper...`);

  for (const story of stories) {
    const job = await runPipelineForStory(story, {
      ttsProvider: piper,
      whisperModelSize: ENV.WHISPER_MODEL_SIZE,
      ...backgroundDeps,
    });
    console.log(`Job pronto para revisao: ${job.jobId}`);
  }

  console.log("Abra storage/pending-review para revisar os videos.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
