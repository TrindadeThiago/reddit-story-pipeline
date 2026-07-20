import "dotenv/config";
import { readPendingJob } from "../modules/review/reviewQueue.js";
import { ElevenLabsProvider } from "../modules/tts/elevenLabsProvider.js";
import { QuotaTracker } from "../modules/tts/quotaTracker.js";
import { runPipelineForStory } from "../pipeline.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Variavel de ambiente obrigatoria ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

/**
 * Uso: npm run regenerate:elevenlabs -- <jobId>
 * Caminho 2 da revisao: "aprovado, mas a voz do Piper ficou fraca".
 * Reroda o pipeline inteiro (narracao -> legenda -> video) so trocando
 * o provider de TTS, e cria um NOVO job para revisao rapida.
 */
async function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error("Uso: npm run regenerate:elevenlabs -- <jobId>");
    process.exit(1);
  }

  const pexelsApiKey = requireEnv("PEXELS_API_KEY");
  const elevenLabsApiKey = requireEnv("ELEVENLABS_API_KEY");
  const elevenLabsVoiceId = requireEnv("ELEVENLABS_VOICE_ID");

  const previousJob = await readPendingJob(jobId);

  const quota = new QuotaTracker(
    "storage/elevenlabs-quota.json",
    Number(process.env.ELEVENLABS_MONTHLY_CHAR_LIMIT ?? 10000)
  );
  const elevenLabs = new ElevenLabsProvider(elevenLabsApiKey, elevenLabsVoiceId, quota);

  const newJob = await runPipelineForStory(previousJob.story, {
    ttsProvider: elevenLabs,
    pexelsApiKey,
    whisperModelSize: process.env.WHISPER_MODEL_SIZE ?? "base",
    backgroundQuery: "pessoa organizando", // TODO: reaproveitar a mesma query do job original
  });

  console.log(`Novo job (ElevenLabs) pronto para revisao rapida: ${newJob.jobId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
