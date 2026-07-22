import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import type { PipelineJob, RedditStory } from "./types.js";
import type { TtsProvider } from "./modules/tts/index.js";
import { generateCaptions } from "./modules/captions/index.js";
import {
  selectLocalBackgroundClips,
  findBackgroundVideo,
  composeVideo,
  type BackgroundInput,
} from "./modules/video/index.js";
import { enqueueForReview } from "./modules/review/index.js";
import { assertSafeId } from "./modules/shared/assertSafeId.js";

type BackgroundSourceDeps =
  | {
      backgroundSource: "local";
      backgroundPackDir: string;
      backgroundPackIndexPath: string;
    }
  | {
      backgroundSource: "pexels";
      pexelsApiKey: string;
      pexelsApiUrl: string;
      backgroundQuery: string; // ex: "pessoa organizando mesa" -- video de "distracao"
    };

type RunPipelineDeps = {
  ttsProvider: TtsProvider; // Piper por padrao; ElevenLabs no caminho de regeneracao
  whisperModelSize: string;
} & BackgroundSourceDeps;

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
 * ja que composeVideo (fase 07) opera sobre caminhos locais. Via streaming
 * para nao carregar o arquivo inteiro (potencialmente centenas de MB) em
 * memoria de uma vez.
 */
async function downloadBackgroundVideo(downloadUrl: string, destPath: string): Promise<void> {
  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(`Download do video de fundo falhou: HTTP ${res.status}`);
  }
  if (!res.body) {
    throw new Error("Download do video de fundo falhou: resposta sem corpo.");
  }
  await finished(Readable.fromWeb(res.body as any).pipe(createWriteStream(destPath)));
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
  assertSafeId(story.id, "story.id");
  const jobId = `${story.id}-${Date.now()}`;
  const workDir = join("storage", "pending-review", jobId);

  const job: PipelineJob = { jobId, story };

  await mkdir(workDir, { recursive: true });

  job.narration = await runStage("narração", jobId, () =>
    deps.ttsProvider.synthesize(story.body, join(workDir, `narration.${deps.ttsProvider.fileExtension}`))
  );

  job.captions = await runStage("legenda", jobId, () =>
    generateCaptions(
      job.narration!.audioFilePath,
      join(workDir, "captions.srt"),
      deps.whisperModelSize
    )
  );

  const background: BackgroundInput = await runStage("vídeo de fundo", jobId, async () => {
    if (deps.backgroundSource === "local") {
      const lastWord = job.captions!.words.at(-1);
      const narrationDurationSeconds = lastWord?.endSeconds ?? 0;
      const clips = await selectLocalBackgroundClips(
        deps.backgroundPackIndexPath,
        narrationDurationSeconds
      );
      return { kind: "clips", packDir: deps.backgroundPackDir, clips };
    }

    const pexelsBackground = await findBackgroundVideo(
      deps.backgroundQuery,
      deps.pexelsApiKey,
      deps.pexelsApiUrl
    );
    const backgroundVideoLocalPath = join(workDir, "background.mp4");
    await downloadBackgroundVideo(pexelsBackground.downloadUrl, backgroundVideoLocalPath);
    return { kind: "single", videoPath: backgroundVideoLocalPath };
  });

  job.video = await runStage("composição", jobId, () =>
    composeVideo({
      narrationAudioPath: job.narration!.audioFilePath,
      background,
      captionsAssPath: job.captions!.assFilePath,
      outputPath: join(workDir, "final.mp4"),
    })
  );

  await runStage("enfileiramento", jobId, () => enqueueForReview(job));

  return job;
}
