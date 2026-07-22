const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Recusa qualquer id/jobId fora de uma whitelist de caracteres seguros,
 * antes que o valor seja usado para compor um caminho no filesystem ou
 * interpolado no filtergraph do ffmpeg. Fecha path traversal (`../`) e
 * injecao de opcoes de filtro (`:`, `'`, `,`, `[`) num unico ponto.
 */
export function assertSafeId(id: string, field: string): void {
  if (!SAFE_ID_PATTERN.test(id)) {
    throw new Error(
      `${field} invalido: "${id}". Esperado apenas letras, numeros, hifen e underscore (padrao ${SAFE_ID_PATTERN}).`
    );
  }
}
