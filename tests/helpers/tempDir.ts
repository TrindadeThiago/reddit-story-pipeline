import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Cria um diretorio temporario real por teste, para exercitar logica de
 * filesystem (fila de revisao, pack de video local) sem mockar `node:fs`
 * chamada a chamada.
 */
export async function withTempDir<T>(
  fn: (dir: string) => Promise<T>
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "reddit-story-pipeline-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
