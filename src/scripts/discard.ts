import { moveToDiscarded } from "../modules/review/index.js";

/**
 * Uso: npm run discard -- <jobId>
 * Caminho 3 da revisao: conteudo/historia nao presta, descarta.
 */
async function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error("Uso: npm run discard -- <jobId>");
    process.exit(1);
  }

  await moveToDiscarded(jobId);
  console.log(`Job ${jobId} movido para storage/discarded.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
