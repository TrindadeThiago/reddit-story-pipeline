import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "REDDIT_CLIENT_ID",
  "REDDIT_CLIENT_SECRET",
  "REDDIT_USER_AGENT",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_API_URL",
  "ELEVENLABS_VOICE_ID",
  "ELEVENLABS_MODEL_ID",
  "ELEVENLABS_MONTHLY_CHAR_LIMIT",
  "PIPER_MODEL_PATH",
  "PIPER_LENGTH_SCALE",
  "PEXELS_API_KEY",
  "PEXELS_API_URL",
  "BACKGROUND_QUERY",
  "BACKGROUND_SOURCE",
  "BACKGROUND_PACK_PLAYLIST_URL",
  "BACKGROUND_PACK_DIR",
  "BACKGROUND_PACK_INDEX_PATH",
  "WHISPER_MODEL_SIZE",
  "WHISPERX_PYTHON_BIN",
] as const;

vi.mock("dotenv/config", () => ({}));

describe("config/env", () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it("aplica valores padrao quando nenhuma variavel de ambiente esta definida", async () => {
    const { ENV } = await import("../../src/config/env.js");

    expect(ENV.REDDIT_CLIENT_ID).toBe("");
    expect(ENV.REDDIT_CLIENT_SECRET).toBe("");
    expect(ENV.REDDIT_USER_AGENT).toBe("reddit-story-pipeline/0.1");
    expect(ENV.ELEVENLABS_API_URL).toBe("https://api.elevenlabs.io/v1");
    expect(ENV.ELEVENLABS_MODEL_ID).toBe("eleven_flash_v2_5");
    expect(ENV.ELEVENLABS_MONTHLY_CHAR_LIMIT).toBe("10000");
    expect(ENV.PIPER_MODEL_PATH).toBe("");
    expect(ENV.PIPER_LENGTH_SCALE).toBe("0.85");
    expect(ENV.PEXELS_API_URL).toBe("https://api.pexels.com");
    expect(ENV.BACKGROUND_QUERY).toBe("pessoa organizando");
    expect(ENV.BACKGROUND_SOURCE).toBe("pexels");
    expect(ENV.BACKGROUND_PACK_DIR).toBe("storage/background-pack");
    expect(ENV.BACKGROUND_PACK_INDEX_PATH).toBe("storage/background-pack/index.json");
    expect(ENV.WHISPER_MODEL_SIZE).toBe("base");
    expect(ENV.WHISPERX_PYTHON_BIN).toBe("");
  });

  it("usa o valor de process.env quando a variavel esta definida", async () => {
    process.env.PIPER_MODEL_PATH = "/models/pt_BR-custom.onnx";
    process.env.PIPER_LENGTH_SCALE = "1.10";
    process.env.BACKGROUND_SOURCE = "local";

    const { ENV } = await import("../../src/config/env.js");

    expect(ENV.PIPER_MODEL_PATH).toBe("/models/pt_BR-custom.onnx");
    expect(ENV.PIPER_LENGTH_SCALE).toBe("1.10");
    expect(ENV.BACKGROUND_SOURCE).toBe("local");
  });
});
