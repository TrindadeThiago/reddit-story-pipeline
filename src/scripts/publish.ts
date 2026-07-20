import { moveToApproved, moveToPublished } from "../modules/review/reviewQueue.js";

/**
 * Uso: npm run publish -- <jobId>
 * Caminho 1 da revisao: "Piper ficou satisfatorio, pode publicar".
 * Por ora so move o arquivo para storage/published; a publicacao
 * de fato (upload pro Instagram/TikTok/YouTube) fica para uma
 * proxima etapa -- normalmente via API oficial de cada plataforma.
 */
async function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error("Uso: npm run publish -- <jobId>");
    process.exit(1);
  }

  await moveToApproved(jobId);
  await moveToPublished(jobId);

  console.log(`Job ${jobId} movido para storage/published.`);
  console.log("TODO: acionar upload via API da plataforma desejada.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
