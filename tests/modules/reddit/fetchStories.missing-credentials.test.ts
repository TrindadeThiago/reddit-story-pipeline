import { afterEach, describe, expect, it, vi } from "vitest";
import { stubFetch } from "../../helpers/mockFetch.js";

describe("fetchStories (credenciais ausentes)", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("reporta erro claro se faltarem credenciais", async () => {
    const originalClientId = process.env.REDDIT_CLIENT_ID;
    const originalClientSecret = process.env.REDDIT_CLIENT_SECRET;
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;

    const fetchStub = stubFetch(async () => {
      throw new Error("fetch nao deveria ser chamado sem credenciais");
    });

    const originalError = console.error;
    const loggedErrors: string[] = [];
    console.error = (msg: string) => loggedErrors.push(msg);

    try {
      vi.resetModules();
      const { fetchStories } = await import("../../../src/modules/reddit/fetchStories.js");
      const stories = await fetchStories({
        subreddits: ["AskHistorians"],
        minScore: 500,
        minBodyLength: 800,
        limit: 5,
      });
      expect(stories.length).toBe(0);
    } finally {
      console.error = originalError;
      fetchStub.restore();
      process.env.REDDIT_CLIENT_ID = originalClientId;
      process.env.REDDIT_CLIENT_SECRET = originalClientSecret;
    }

    expect(
      loggedErrors.some((m) => m.includes("REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET ausentes"))
    ).toBe(true);
  });
});
