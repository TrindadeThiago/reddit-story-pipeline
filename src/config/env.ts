import "dotenv/config";

export const ENV = {
  REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID ?? "",
  REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET ?? "",
  REDDIT_USER_AGENT: process.env.REDDIT_USER_AGENT ?? "reddit-story-pipeline/0.1",

  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ?? "",
  ELEVENLABS_API_URL: process.env.ELEVENLABS_API_URL ?? "https://api.elevenlabs.io/v1",
  ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID ?? "",
  ELEVENLABS_MODEL_ID: process.env.ELEVENLABS_MODEL_ID ?? "eleven_flash_v2_5",
  ELEVENLABS_MONTHLY_CHAR_LIMIT: process.env.ELEVENLABS_MONTHLY_CHAR_LIMIT ?? "10000",
  PIPER_MODEL_PATH: process.env.PIPER_MODEL_PATH ?? "",

  PEXELS_API_KEY: process.env.PEXELS_API_KEY ?? "",
  PEXELS_API_URL: process.env.PEXELS_API_URL ?? "https://api.pexels.com",
  BACKGROUND_QUERY: process.env.BACKGROUND_QUERY ?? "pessoa organizando",

  WHISPER_MODEL_SIZE: process.env.WHISPER_MODEL_SIZE ?? "base",
  WHISPERX_PYTHON_BIN: process.env.WHISPERX_PYTHON_BIN ?? "",
} as const;
