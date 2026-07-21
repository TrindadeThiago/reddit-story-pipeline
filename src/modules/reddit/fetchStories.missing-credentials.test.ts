import { test } from "node:test";
import assert from "node:assert/strict";

// Arquivo isolado: node:test roda cada arquivo em processo proprio, entao
// deletar as credenciais aqui acontece ANTES do primeiro import de
// ../../config/env.js (o objeto ENV congela process.env no primeiro import
// desse modulo no processo, entao nao pode dividir esse cenario com outros
// testes que setam REDDIT_CLIENT_ID/SECRET no mesmo arquivo).
delete process.env.REDDIT_CLIENT_ID;
delete process.env.REDDIT_CLIENT_SECRET;

test("fetchStories reporta erro claro se faltarem credenciais", async () => {
  const fakeFetch: typeof fetch = async () => {
    throw new Error("fetch nao deveria ser chamado sem credenciais");
  };
  const originalFetch = global.fetch;
  global.fetch = fakeFetch;

  const originalError = console.error;
  const loggedErrors: string[] = [];
  console.error = (msg: string) => loggedErrors.push(msg);

  try {
    const { fetchStories } = await import("./fetchStories.js");
    const stories = await fetchStories({
      subreddits: ["AskHistorians"],
      minScore: 500,
      minBodyLength: 800,
      limit: 5,
    });
    assert.equal(stories.length, 0);
  } finally {
    console.error = originalError;
    global.fetch = originalFetch;
  }

  assert.ok(
    loggedErrors.some((m) => m.includes("REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET ausentes")),
    "deveria logar erro explicando credenciais ausentes"
  );
});
