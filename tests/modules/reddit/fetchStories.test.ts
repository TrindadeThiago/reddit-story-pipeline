import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, stubFetch } from "../../helpers/mockFetch.js";

async function withMockedEnvAndFetch(
  env: Record<string, string | undefined>,
  handler: (url: string, init?: RequestInit) => Promise<Response>,
  fn: () => Promise<void>
) {
  const originalEnv = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const fetchStub = stubFetch(handler);

  try {
    await fn();
  } finally {
    process.env = originalEnv;
    fetchStub.restore();
  }
}

describe("fetchStories", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("usa OAuth (access_token + Bearer) e filtra por score/tamanho", async () => {
    let tokenAuthHeader: string | undefined;
    let bearerHeader: string | undefined;

    await withMockedEnvAndFetch(
      {
        REDDIT_CLIENT_ID: "test-id",
        REDDIT_CLIENT_SECRET: "test-secret",
        REDDIT_USER_AGENT: "test-agent/1.0",
      },
      async (url, init) => {
        if (url === "https://www.reddit.com/api/v1/access_token") {
          tokenAuthHeader = (init?.headers as Record<string, string>).Authorization;
          return jsonResponse({ access_token: "fake-token", expires_in: 3600 });
        }

        if (url.startsWith("https://oauth.reddit.com/r/AskHistorians/top")) {
          bearerHeader = (init?.headers as Record<string, string>).Authorization;
          return jsonResponse({
            data: {
              children: [
                {
                  data: {
                    id: "abc",
                    title: "Historia longa o suficiente",
                    selftext: "x".repeat(900),
                    permalink: "/r/AskHistorians/comments/abc",
                    score: 600,
                  },
                },
                {
                  data: {
                    id: "def",
                    title: "Historia curta demais",
                    selftext: "muito curta",
                    permalink: "/r/AskHistorians/comments/def",
                    score: 900,
                  },
                },
              ],
            },
          });
        }

        throw new Error(`URL inesperada no teste: ${url}`);
      },
      async () => {
        vi.resetModules();
        const { fetchStories } = await import("../../../src/modules/reddit/fetchStories.js");

        const stories = await fetchStories({
          subreddits: ["AskHistorians"],
          minScore: 500,
          minBodyLength: 800,
          limit: 5,
        });

        expect(stories.length).toBe(1);
        expect(stories[0].id).toBe("abc");
        expect(tokenAuthHeader).toBe(
          `Basic ${Buffer.from("test-id:test-secret").toString("base64")}`
        );
        expect(bearerHeader).toBe("Bearer fake-token");
      }
    );
  });

  it("usa o token em cache (nao chama access_token de novo) em subreddits subsequentes na mesma execucao", async () => {
    let tokenCalls = 0;

    await withMockedEnvAndFetch(
      {
        REDDIT_CLIENT_ID: "test-id",
        REDDIT_CLIENT_SECRET: "test-secret",
        REDDIT_USER_AGENT: "test-agent/1.0",
      },
      async (url) => {
        if (url === "https://www.reddit.com/api/v1/access_token") {
          tokenCalls += 1;
          return jsonResponse({ access_token: "fake-token", expires_in: 3600 });
        }
        return jsonResponse({ data: { children: [] } });
      },
      async () => {
        vi.resetModules();
        const { fetchStories } = await import("../../../src/modules/reddit/fetchStories.js");

        await fetchStories({
          subreddits: ["AskHistorians", "HistoriasBrasil"],
          minScore: 0,
          minBodyLength: 0,
          limit: 5,
        });

        expect(tokenCalls).toBe(1);
      }
    );
  });

  it("reusa o access_token em cache entre chamadas de fetchStories, sem pedir um novo", async () => {
    let tokenCalls = 0;

    await withMockedEnvAndFetch(
      {
        REDDIT_CLIENT_ID: "test-id",
        REDDIT_CLIENT_SECRET: "test-secret",
        REDDIT_USER_AGENT: "test-agent/1.0",
      },
      async (url) => {
        if (url === "https://www.reddit.com/api/v1/access_token") {
          tokenCalls += 1;
          return jsonResponse({ access_token: "fake-token", expires_in: 3600 });
        }
        return jsonResponse({ data: { children: [] } });
      },
      async () => {
        vi.resetModules();
        const { fetchStories } = await import("../../../src/modules/reddit/fetchStories.js");

        await fetchStories({ subreddits: ["Ok"], minScore: 0, minBodyLength: 0, limit: 5 });
        await fetchStories({ subreddits: ["Ok"], minScore: 0, minBodyLength: 0, limit: 5 });

        expect(tokenCalls).toBe(1);
      }
    );
  });

  it("isola falha de um subreddit sem interromper os demais", async () => {
    await withMockedEnvAndFetch(
      {
        REDDIT_CLIENT_ID: "test-id",
        REDDIT_CLIENT_SECRET: "test-secret",
        REDDIT_USER_AGENT: "test-agent/1.0",
      },
      async (url) => {
        if (url === "https://www.reddit.com/api/v1/access_token") {
          return jsonResponse({ access_token: "fake-token", expires_in: 3600 });
        }
        if (url.startsWith("https://oauth.reddit.com/r/Broken/top")) {
          return new Response("erro", { status: 500, statusText: "Internal Error" });
        }
        if (url.startsWith("https://oauth.reddit.com/r/Ok/top")) {
          return jsonResponse({
            data: {
              children: [
                {
                  data: {
                    id: "ok1",
                    title: "ok",
                    selftext: "y".repeat(50),
                    permalink: "/r/Ok/comments/ok1",
                    score: 10,
                  },
                },
              ],
            },
          });
        }
        throw new Error(`URL inesperada no teste: ${url}`);
      },
      async () => {
        vi.resetModules();
        const { fetchStories } = await import("../../../src/modules/reddit/fetchStories.js");

        const stories = await fetchStories({
          subreddits: ["Broken", "Ok"],
          minScore: 0,
          minBodyLength: 0,
          limit: 5,
        });

        expect(stories.length).toBe(1);
        expect(stories[0].id).toBe("ok1");
      }
    );
  });

  it("lanca erro (via String()) quando a autenticacao lanca algo que nao e um Error", async () => {
    await withMockedEnvAndFetch(
      {
        REDDIT_CLIENT_ID: "test-id",
        REDDIT_CLIENT_SECRET: "test-secret",
        REDDIT_USER_AGENT: "test-agent/1.0",
      },
      async () => {
        throw "falha nao-Error na autenticacao";
      },
      async () => {
        vi.resetModules();
        const { fetchStories } = await import("../../../src/modules/reddit/fetchStories.js");

        await expect(
          fetchStories({
            subreddits: ["AskHistorians"],
            minScore: 0,
            minBodyLength: 0,
            limit: 5,
          })
        ).rejects.toThrow(/falha nao-Error na autenticacao/);
      }
    );
  });

  it("loga a mensagem de erro (via String()) quando a busca por um subreddit lanca algo que nao e um Error", async () => {
    const originalError = console.error;
    const loggedErrors: string[] = [];
    console.error = (msg: string) => loggedErrors.push(msg);

    try {
      await withMockedEnvAndFetch(
        {
          REDDIT_CLIENT_ID: "test-id",
          REDDIT_CLIENT_SECRET: "test-secret",
          REDDIT_USER_AGENT: "test-agent/1.0",
        },
        async (url) => {
          if (url === "https://www.reddit.com/api/v1/access_token") {
            return jsonResponse({ access_token: "fake-token", expires_in: 3600 });
          }
          throw "falha nao-Error ao buscar subreddit";
        },
        async () => {
          vi.resetModules();
          const { fetchStories } = await import("../../../src/modules/reddit/fetchStories.js");
          const stories = await fetchStories({
            subreddits: ["AskHistorians"],
            minScore: 0,
            minBodyLength: 0,
            limit: 5,
          });
          expect(stories.length).toBe(0);
        }
      );
    } finally {
      console.error = originalError;
    }

    expect(
      loggedErrors.some((m) => m.includes("falha nao-Error ao buscar subreddit"))
    ).toBe(true);
  });

  it("lanca erro explicito (nao retorna lista vazia) quando a autenticacao OAuth falha", async () => {
    await withMockedEnvAndFetch(
      {
        REDDIT_CLIENT_ID: "test-id",
        REDDIT_CLIENT_SECRET: "test-secret",
        REDDIT_USER_AGENT: "test-agent/1.0",
      },
      async (url) => {
        if (url === "https://www.reddit.com/api/v1/access_token") {
          return new Response("erro", { status: 401, statusText: "Unauthorized" });
        }
        throw new Error(`URL inesperada no teste: ${url}`);
      },
      async () => {
        vi.resetModules();
        const { fetchStories } = await import("../../../src/modules/reddit/fetchStories.js");

        await expect(
          fetchStories({
            subreddits: ["AskHistorians"],
            minScore: 0,
            minBodyLength: 0,
            limit: 5,
          })
        ).rejects.toThrow(/\[fetchStories\] Falha ao autenticar no Reddit/);
      }
    );
  });
});
