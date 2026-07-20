import "dotenv/config";
import { fetchStories } from "../modules/reddit/fetchStories.js";
import { PiperProvider } from "../modules/tts/piperProvider.js";
import { runPipelineForStory } from "../pipeline.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Variavel de ambiente obrigatoria ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const piperModelPath = requireEnv("PIPER_MODEL_PATH");
  const pexelsApiKey = requireEnv("PEXELS_API_KEY");

  const stories = await fetchStories({
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
