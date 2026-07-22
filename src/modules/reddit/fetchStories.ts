import { ENV } from "../../config/index.js";
import type { RedditStory } from "../../types.js";

interface FetchStoriesOptions {
  subreddits: string[]; // ex: ["AskHistorians", "HistoriasBrasil"]
  minScore: number;
  minBodyLength: number;
  limit: number;
}

interface AccessTokenCache {
  token: string;
  expiresAt: number; // epoch ms
}

let tokenCache: AccessTokenCache | null = null;

/**
 * O endpoint JSON publico (reddit.com/r/x/top.json sem auth) e bloqueado
 * com 403 por IPs de datacenter/cloud, independente de User-Agent. A API
 * oficial via OAuth (oauth.reddit.com) nao sofre esse bloqueio.
 */
async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const clientId = ENV.REDDIT_CLIENT_ID;
  const clientSecret = ENV.REDDIT_CLIENT_SECRET;
  const userAgent = ENV.REDDIT_USER_AGENT;

  if (!clientId || !clientSecret) {
    throw new Error(
      "REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET ausentes. Crie um app tipo 'script' em https://www.reddit.com/prefs/apps e preencha o .env."
    );
  }

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Falha ao obter access_token do Reddit: HTTP ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };

  tokenCache = {
    token: json.access_token,
    // margem de seguranca de 60s antes de expirar
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
  };

  return tokenCache.token;
}

/**
 * Usa a API OAuth do Reddit (client_credentials, acesso somente leitura)
 * respeitando rate limit. Requer app tipo 'script' em reddit.com/prefs/apps.
 */
export async function fetchStories(
  options: FetchStoriesOptions
): Promise<RedditStory[]> {
  const results: RedditStory[] = [];
  const userAgent = ENV.REDDIT_USER_AGENT;

  // Falha de autenticacao e uma falha global de configuracao (nao de um
  // subreddit especifico) -- diferente de erros de busca por subreddit
  // (isolados abaixo), aqui deve interromper a execucao, nao retornar [].
  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (error) {
    throw new Error(
      `[fetchStories] Falha ao autenticar no Reddit: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    );
  }

  for (const subreddit of options.subreddits) {
    try {
      const res = await fetch(
        `https://oauth.reddit.com/r/${subreddit}/top?t=week&limit=${options.limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": userAgent,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const json = await res.json();

      for (const child of json.data.children) {
        const post = child.data;
        if (
          post.score >= options.minScore &&
          post.selftext?.length >= options.minBodyLength
        ) {
          results.push({
            id: post.id,
            subreddit,
            title: post.title,
            body: post.selftext,
            url: `https://reddit.com${post.permalink}`,
            score: post.score,
          });
        }
      }
    } catch (error) {
      console.error(
        `[fetchStories] Falha ao buscar r/${subreddit}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return results;
}
