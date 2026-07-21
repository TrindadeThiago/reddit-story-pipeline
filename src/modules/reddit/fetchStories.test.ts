import { test } from "node:test";
import assert from "node:assert/strict";

async function withMockedEnvAndFetch(
  env: Record<string, string | undefined>,
  fetchImpl: typeof fetch,
  fn: () => Promise<void>
) {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  global.fetch = fetchImpl;

  try {
    await fn();
  } finally {
    process.env = originalEnv;
    global.fetch = originalFetch;
  }
}

test("fetchStories usa OAuth (access_token + Bearer) e filtra por score/tamanho", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });

    if (url === "https://www.reddit.com/api/v1/access_token") {
      return new Response(
        JSON.stringify({ access_token: "fake-token", expires_in: 3600 }),
        { status: 200 }
      );
    }

    if (url.startsWith("https://oauth.reddit.com/r/AskHistorians/top")) {
      return new Response(
        JSON.stringify({
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
        }),
        { status: 200 }
      );
    }

    throw new Error(`URL inesperada no teste: ${url}`);
  };

  await withMockedEnvAndFetch(
    {
      REDDIT_CLIENT_ID: "test-id",
      REDDIT_CLIENT_SECRET: "test-secret",
      REDDIT_USER_AGENT: "test-agent/1.0",
    },
    fakeFetch,
    async () => {
      // reimporta o modulo a cada teste para resetar o cache de token em memoria
      const { fetchStories } = await import(`./fetchStories.js?t=${Date.now()}`);

      const stories = await fetchStories({
        subreddits: ["AskHistorians"],
        minScore: 500,
        minBodyLength: 800,
        limit: 5,
      });

      assert.equal(stories.length, 1);
      assert.equal(stories[0].id, "abc");

      const tokenCall = calls.find((c) => c.url.includes("access_token"));
      assert.ok(tokenCall, "deveria ter chamado o endpoint de access_token");
      const authHeader = (tokenCall!.init!.headers as Record<string, string>).Authorization;
      assert.equal(
        authHeader,
        `Basic ${Buffer.from("test-id:test-secret").toString("base64")}`
      );

      const dataCall = calls.find((c) => c.url.includes("oauth.reddit.com"));
      assert.ok(dataCall, "deveria ter chamado o endpoint oauth.reddit.com");
      const bearerHeader = (dataCall!.init!.headers as Record<string, string>).Authorization;
      assert.equal(bearerHeader, "Bearer fake-token");
    }
  );
});
