import { afterEach, describe, expect, it, vi } from "vitest";
import { stubFetch } from "../../helpers/mockFetch.js";

describe("fetchStories (credenciais ausentes)", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("lanca erro explicito em vez de retornar lista vazia quando faltam credenciais", async () => {
    const originalClientId = process.env.REDDIT_CLIENT_ID;
    const originalClientSecret = process.env.REDDIT_CLIENT_SECRET;
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;

    const fetchStub = stubFetch(async () => {
      throw new Error("fetch nao deveria ser chamado sem credenciais");
    });

    try {
      vi.resetModules();
      const { fetchStories } = await import("../../../src/modules/reddit/fetchStories.js");

      await expect(
        fetchStories({
          subreddits: ["AskHistorians"],
          minScore: 500,
          minBodyLength: 800,
          limit: 5,
        })
      ).rejects.toThrow(
        /\[fetchStories\] Falha ao autenticar no Reddit.*REDDIT_CLIENT_ID\/REDDIT_CLIENT_SECRET ausentes/
      );
    } finally {
      fetchStub.restore();
      process.env.REDDIT_CLIENT_ID = originalClientId;
      process.env.REDDIT_CLIENT_SECRET = originalClientSecret;
    }
  });
});
