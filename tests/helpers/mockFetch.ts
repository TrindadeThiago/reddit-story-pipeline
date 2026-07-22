import { vi } from "vitest";

export interface FetchCall {
  url: string;
  init?: RequestInit;
}

/**
 * Substitui o `fetch` global por uma implementacao controlada pelo teste,
 * registrando cada chamada para asserções e restaurando o `fetch` original
 * ao final (via `restore()`).
 */
export function stubFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const calls: FetchCall[] = [];
  const original = global.fetch;

  const fake: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  };

  global.fetch = vi.fn(fake) as unknown as typeof fetch;

  return {
    calls,
    restore: () => {
      global.fetch = original;
    },
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}
