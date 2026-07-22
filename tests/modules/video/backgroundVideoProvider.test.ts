import { describe, expect, it } from "vitest";
import { findBackgroundVideo } from "../../../src/modules/video/backgroundVideoProvider.js";
import { jsonResponse, stubFetch } from "../../helpers/mockFetch.js";

describe("findBackgroundVideo", () => {
  it("seleciona o arquivo vertical de maior altura disponivel", async () => {
    const fetchStub = stubFetch(async (url, init) => {
      expect(url).toContain("query=pessoa%20organizando");
      expect((init?.headers as Record<string, string>).Authorization).toBe("pexels-key");
      return jsonResponse({
        videos: [
          {
            duration: 45,
            video_files: [
              { width: 1920, height: 1080, link: "https://cdn/horizontal.mp4" },
              { width: 720, height: 1280, link: "https://cdn/vertical-720.mp4" },
              { width: 1080, height: 1920, link: "https://cdn/vertical-1080.mp4" },
            ],
          },
        ],
      });
    });

    try {
      const result = await findBackgroundVideo(
        "pessoa organizando",
        "pexels-key",
        "https://api.pexels.com"
      );

      expect(result).toEqual({
        downloadUrl: "https://cdn/vertical-1080.mp4",
        durationSeconds: 45,
      });
    } finally {
      fetchStub.restore();
    }
  });

  it("lanca erro claro quando a resposta da Pexels nao e ok (ex: 401/429)", async () => {
    const fetchStub = stubFetch(async () => new Response("erro", { status: 401, statusText: "Unauthorized" }));

    try {
      await expect(
        findBackgroundVideo("qualquer coisa", "chave-invalida", "https://api.pexels.com")
      ).rejects.toThrow(/Busca de video na Pexels falhou: HTTP 401/);
    } finally {
      fetchStub.restore();
    }
  });

  it("lanca erro quando nenhum video e encontrado para a query", async () => {
    const fetchStub = stubFetch(async () => jsonResponse({ videos: [] }));

    try {
      await expect(
        findBackgroundVideo("query sem resultado", "key", "https://api.pexels.com")
      ).rejects.toThrow(/Nenhum video encontrado para query: query sem resultado/);
    } finally {
      fetchStub.restore();
    }
  });

  it("lanca erro quando o video encontrado nao tem arquivo em orientacao retrato", async () => {
    const fetchStub = stubFetch(async () =>
      jsonResponse({
        videos: [
          {
            duration: 30,
            video_files: [{ width: 1920, height: 1080, link: "https://cdn/horizontal.mp4" }],
          },
        ],
      })
    );

    try {
      await expect(
        findBackgroundVideo("so horizontal", "key", "https://api.pexels.com")
      ).rejects.toThrow(/Nenhum arquivo de video em orientacao retrato encontrado/);
    } finally {
      fetchStub.restore();
    }
  });
});
