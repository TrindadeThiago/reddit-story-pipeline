import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { PipelineJob, RedditStory } from "./types.js";
import type { TtsProvider } from "./modules/tts/index.js";
import { generateCaptions } from "./modules/captions/index.js";
import { findBackgroundVideo, composeVideo } from "./modules/video/index.js";
import { enqueueForReview } from "./modules/review/index.js";

interface RunPipelineDeps {
  ttsProvider: TtsProvider; // Piper por padrao; ElevenLabs no caminho de regeneracao
  pexelsApiKey: string;
  pexelsApiUrl: string;
  whisperModelSize: string;
  backgroundQuery: string; // ex: "pessoa organizando mesa" -- video de "distracao"
}

async function runStage<T>(stage: string, jobId: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (cause) {
    throw new Error(
      `runPipelineForStory: falha na etapa "${stage}" (job ${jobId}): ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
      { cause }
    );
  }
}

/**
 * Baixa o video de fundo (URL remota da fase 06) para um arquivo local,
 * ja que composeVideo (fase 07) opera sobre caminhos locais.
 */
async function downloadBackgroundVideo(downloadUrl: string, destPath: string): Promise<void> {
  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(`Download do video de fundo falhou: HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buffer);
}

/**
 * Roda o pipeline inteiro para UMA historia, do texto ate o video pronto
 * para revisao manual. E chamado tanto no fluxo normal (Piper) quanto no
 * fluxo de regeneracao (ElevenLabs) -- so muda o ttsProvider injetado.
 */
export async function runPipelineForStory(
  story: RedditStory,
  deps: RunPipelineDeps
): Promise<PipelineJob> {
  const jobId = `${story.id}-${Date.now()}`;
  const workDir = join("storage", "pending-review", jobId);

  const job: PipelineJob = { jobId, story };

  await mkdir(workDir, { recursive: true });

  job.narration = await runStage("narração", jobId, () =>
    deps.ttsProvider.synthesize(story.body, join(workDir, "narration.mp3"))
  );

  job.captions = await runStage("legenda", jobId, () =>
    generateCaptions(
      job.narration!.audioFilePath,
      join(workDir, "captions.srt"),
      deps.whisperModelSize
    )
  );

  const backgroundVideoLocalPath = join(workDir, "background.mp4");
  await runStage("vídeo de fundo", jobId, async () => {
    const background = await findBackgroundVideo(
      deps.backgroundQuery,
      deps.pexelsApiKey,
      deps.pexelsApiUrl
    );
    await downloadBackgroundVideo(background.downloadUrl, backgroundVideoLocalPath);
  });

  job.video = await runStage("composição", jobId, () =>
    composeVideo({
      narrationAudioPath: job.narration!.audioFilePath,
      backgroundVideoPath: backgroundVideoLocalPath,
      captionsAssPath: job.captions!.assFilePath,
      outputPath: join(workDir, "final.mp4"),
    })
  );

  await runStage("enfileiramento", jobId, () => enqueueForReview(job));

  return job;
}
