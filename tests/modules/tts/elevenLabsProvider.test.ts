import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ElevenLabsProvider } from "../../../src/modules/tts/elevenLabsProvider.js";
import { QuotaTracker } from "../../../src/modules/tts/quotaTracker.js";
import { stubFetch } from "../../helpers/mockFetch.js";
import { withTempDir } from "../../helpers/tempDir.js";

describe("ElevenLabsProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("declara fileExtension mp3", async () => {
    await withTempDir(async (dir) => {
      const quota = new QuotaTracker(join(dir, "quota.json"), 10000);
      const provider = new ElevenLabsProvider(
        "api-key",
        "voice-1",
        quota,
        "https://api.elevenlabs.io/v1",
        "eleven_multilingual_v2"
      );
      expect(provider.fileExtension).toBe("mp3");
    });
  });

  it("sintetiza com sucesso, grava o audio e registra o uso na cota", async () => {
    await withTempDir(async (dir) => {
      const quota = new QuotaTracker(join(dir, "quota.json"), 10000);
      const fetchStub = stubFetch(async (url, init) => {
        expect(url).toBe("https://api.elevenlabs.io/v1/text-to-speech/voice-1");
        expect((init?.headers as Record<string, string>)["xi-api-key"]).toBe("api-key");
        return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 });
      });

      try {
        const provider = new ElevenLabsProvider(
          "api-key",
          "voice-1",
          quota,
          "https://api.elevenlabs.io/v1",
          "eleven_flash_v2_5"
        );

        const outputPath = join(dir, "narration.mp3");
        const result = await provider.synthesize("texto de teste", outputPath);

        expect(result).toEqual({
          provider: "elevenlabs",
          audioFilePath: outputPath,
          charactersUsed: "texto de teste".length,
        });
        const written = await readFile(outputPath);
        expect(written).toEqual(Buffer.from([1, 2, 3, 4]));

        const quotaState = JSON.parse(await readFile(join(dir, "quota.json"), "utf-8"));
        expect(quotaState.charactersUsed).toBe("texto de teste".length);
      } finally {
        fetchStub.restore();
      }
    });
  });

  it("lanca erro e nao grava audio quando a cota mensal ja esta estourada", async () => {
    await withTempDir(async (dir) => {
      const quota = new QuotaTracker(join(dir, "quota.json"), 5);
      const fetchStub = stubFetch(async () => {
        throw new Error("fetch nao deveria ser chamado com cota estourada");
      });

      try {
        const provider = new ElevenLabsProvider(
          "api-key",
          "voice-1",
          quota,
          "https://api.elevenlabs.io/v1",
          "eleven_flash_v2_5"
        );

        await expect(
          provider.synthesize("texto maior que a cota", join(dir, "narration.mp3"))
        ).rejects.toThrow(/Cota mensal do ElevenLabs estourada/);
      } finally {
        fetchStub.restore();
      }
    });
  });

  it("lanca erro quando a API da ElevenLabs responde com falha", async () => {
    await withTempDir(async (dir) => {
      const quota = new QuotaTracker(join(dir, "quota.json"), 10000);
      const fetchStub = stubFetch(async () => new Response("chave invalida", { status: 401 }));

      try {
        const provider = new ElevenLabsProvider(
          "api-key-invalida",
          "voice-1",
          quota,
          "https://api.elevenlabs.io/v1",
          "eleven_flash_v2_5"
        );

        await expect(
          provider.synthesize("texto", join(dir, "narration.mp3"))
        ).rejects.toThrow(/ElevenLabs falhou: 401/);
      } finally {
        fetchStub.restore();
      }
    });
  });
});
