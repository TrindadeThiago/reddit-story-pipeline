import { ENV } from "../config/index.js";
import { readPendingJob } from "../modules/review/index.js";
import { ElevenLabsProvider, QuotaTracker } from "../modules/tts/index.js";
import { runPipelineForStory } from "../pipeline.js";
import { assertSafeId } from "../modules/shared/assertSafeId.js";

function requireEnv<K extends keyof typeof ENV>(name: K): string {
  const value = ENV[name];
  if (!value) {
    console.error(`Variavel de ambiente obrigatoria ausente: ${name}`);
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
    console.error(
      "Uso: yarn regenerate:elevenlabs <jobId> --background-query <termo de busca>"
    );
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
    console.error("Uso: yarn regenerate:elevenlabs <jobId> --background-source <pexels|local>");
    process.exit(1);
  }
  return value;
}

/**
 * Uso: yarn regenerate:elevenlabs <jobId> --background-query "termo de busca"
 * Caminho 2 da revisao: "aprovado, mas a voz do Piper ficou fraca".
 * Reroda o pipeline inteiro (narracao -> legenda -> video) so trocando
 * o provider de TTS, e cria um NOVO job para revisao rapida.
 * --background-query (ou env BACKGROUND_QUERY): termo usado na busca do video de fundo no Pexels.
 * --background-source (ou env BACKGROUND_SOURCE): "pexels" (padrao) ou "local".
 */
async function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error("Uso: yarn regenerate:elevenlabs <jobId>");
    process.exit(1);
  }

  assertSafeId(jobId, "jobId");

  const backgroundSource = getBackgroundSourceFlag() ?? ENV.BACKGROUND_SOURCE;
  const elevenLabsApiKey = requireEnv("ELEVENLABS_API_KEY");
  const elevenLabsVoiceId = requireEnv("ELEVENLABS_VOICE_ID");
  const elevenLabsApiUrl = ENV.ELEVENLABS_API_URL;
  const elevenLabsModelId = ENV.ELEVENLABS_MODEL_ID;

  const previousJob = await readPendingJob(jobId);

  const quota = new QuotaTracker(
    "storage/elevenlabs-quota.json",
    Number(ENV.ELEVENLABS_MONTHLY_CHAR_LIMIT)
  );
  const elevenLabs = new ElevenLabsProvider(
    elevenLabsApiKey,
    elevenLabsVoiceId,
    quota,
    elevenLabsApiUrl,
    elevenLabsModelId
  );

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

  const newJob = await runPipelineForStory(previousJob.story, {
    ttsProvider: elevenLabs,
    whisperModelSize: ENV.WHISPER_MODEL_SIZE,
    ...backgroundDeps,
  });

  console.log(`Novo job (ElevenLabs) pronto para revisao rapida: ${newJob.jobId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
