import { moveToDiscarded } from "../modules/review/index.js";
import { assertSafeId } from "../modules/shared/assertSafeId.js";

/**
 * Uso: yarn discard <jobId>
 * Caminho 3 da revisao: conteudo/historia nao presta, descarta.
 */
async function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error("Uso: yarn discard <jobId>");
    process.exit(1);
  }

  assertSafeId(jobId, "jobId");

  await moveToDiscarded(jobId);
  console.log(`Job ${jobId} movido para storage/discarded.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
