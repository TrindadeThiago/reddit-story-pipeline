/**
 * Busca video de fundo royalty-free (Pexels), evitando risco de direitos
 * autorais comum em clipes de gameplay/satisfatorios sem licenca.
 */
export async function findBackgroundVideo(
  query: string,
  pexelsApiKey: string,
  apiUrl: string
): Promise<{ downloadUrl: string; durationSeconds: number }> {
  const res = await fetch(
    `${apiUrl}/videos/search?query=${encodeURIComponent(
      query
    )}&orientation=portrait&per_page=5&min_duration=60`,
    { headers: { Authorization: pexelsApiKey } }
  );
  const json = await res.json();

  const video = json.videos?.[0];
  if (!video) {
    throw new Error(`Nenhum video encontrado para query: ${query}`);
  }

  // Escolhe o arquivo de video vertical de melhor qualidade disponivel
  const verticalFiles = video.video_files
    .filter((f: any) => f.width < f.height)
    .sort((a: any, b: any) => b.height - a.height);

  if (verticalFiles.length === 0) {
    throw new Error(
      `Nenhum arquivo de video em orientacao retrato encontrado para query: ${query}`
    );
  }

  return { downloadUrl: verticalFiles[0].link, durationSeconds: video.duration };
}
