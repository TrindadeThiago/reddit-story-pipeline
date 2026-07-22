import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PiperProvider } from "../../../src/modules/tts/piperProvider.js";

type FakeChildProcess = EventEmitter & {
  stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
  stderr: EventEmitter;
};

function createFakeChild(): FakeChildProcess {
  const child = new EventEmitter() as FakeChildProcess;
  child.stderr = new EventEmitter();
  child.stdin = { write: vi.fn(), end: vi.fn() };
  return child;
}

let spawnBehavior: (child: FakeChildProcess) => void;
const spawnCalls: Array<{ command: string; args: string[] }> = [];

vi.mock("node:child_process", () => ({
  spawn: (command: string, args: string[]) => {
    spawnCalls.push({ command, args });
    const child = createFakeChild();
    spawnBehavior(child);
    return child;
  },
}));

describe("PiperProvider", () => {
  beforeEach(() => {
    spawnCalls.length = 0;
    spawnBehavior = (child) => {
      process.nextTick(() => child.emit("close", 0));
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("chama o binario piper com os parametros corretos e escreve o texto no stdin", async () => {
    const provider = new PiperProvider("/models/pt_BR.onnx", "0.85");

    const result = await provider.synthesize("Ola mundo", "/tmp/out.mp3");

    expect(spawnCalls[0].command).toBe("piper");
    expect(spawnCalls[0].args).toEqual([
      "--model",
      "/models/pt_BR.onnx",
      "--length_scale",
      "0.85",
      "--output_file",
      "/tmp/out.mp3",
    ]);
    expect(result).toEqual({
      provider: "piper",
      audioFilePath: "/tmp/out.mp3",
      charactersUsed: "Ola mundo".length,
    });
  });

  it("rejeita com o stderr do binario quando o processo termina com codigo diferente de zero", async () => {
    spawnBehavior = (child) => {
      process.nextTick(() => {
        child.stderr.emit("data", Buffer.from("modelo nao encontrado"));
        child.emit("close", 1);
      });
    };
    const provider = new PiperProvider("/models/pt_BR.onnx", "0.85");

    await expect(provider.synthesize("texto", "/tmp/out.mp3")).rejects.toThrow(
      /piper saiu com codigo 1: modelo nao encontrado/
    );
  });

  it("rejeita com mensagem sem stderr quando o processo falha sem escrever nada em stderr", async () => {
    spawnBehavior = (child) => {
      process.nextTick(() => child.emit("close", 1));
    };
    const provider = new PiperProvider("/models/pt_BR.onnx", "0.85");

    await expect(provider.synthesize("texto", "/tmp/out.mp3")).rejects.toThrow(
      "piper saiu com codigo 1"
    );
  });

  it("rejeita quando o binario piper nao pode ser executado (evento error)", async () => {
    spawnBehavior = (child) => {
      process.nextTick(() => child.emit("error", new Error("spawn piper ENOENT")));
    };
    const provider = new PiperProvider("/models/pt_BR.onnx", "0.85");

    await expect(provider.synthesize("texto", "/tmp/out.mp3")).rejects.toThrow(
      "spawn piper ENOENT"
    );
  });
});
