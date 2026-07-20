import { mkdir, rename, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PipelineJob } from "../../types.js";

const PENDING_DIR = "storage/pending-review";
const APPROVED_DIR = "storage/approved";
const PUBLISHED_DIR = "storage/published";
const DISCARDED_DIR = "storage/discarded";

/**
 * Fila de revisao baseada em pastas: cada job vira uma subpasta com o
 * video pronto + um job.json com os metadados. Voce (humano) abre a
 * pasta "pending-review", assiste ao mp4 e decide o caminho.
 *
 * Simples de propósito -- sem painel/UI, so pastas no filesystem.
 * Se o volume crescer, trocar por uma tabela em SQLite + uma UI leve.
 */
export async function enqueueForReview(job: PipelineJob): Promise<string> {
  const jobDir = join(PENDING_DIR, job.jobId);
  await mkdir(jobDir, { recursive: true });
  await writeFile(join(jobDir, "job.json"), JSON.stringify(job, null, 2));
  return jobDir;
}

export async function readPendingJob(jobId: string): Promise<PipelineJob> {
  const raw = await readFile(join(PENDING_DIR, jobId, "job.json"), "utf-8");
  return JSON.parse(raw) as PipelineJob;
}

export async function moveToApproved(jobId: string): Promise<void> {
  await rename(join(PENDING_DIR, jobId), join(APPROVED_DIR, jobId));
}

export async function moveToPublished(jobId: string): Promise<void> {
  await rename(join(APPROVED_DIR, jobId), join(PUBLISHED_DIR, jobId));
}

export async function moveToDiscarded(jobId: string): Promise<void> {
  await rename(join(PENDING_DIR, jobId), join(DISCARDED_DIR, jobId));
}
