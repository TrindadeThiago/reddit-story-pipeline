import { vi } from "vitest";

export class ProcessExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`process.exit(${code})`);
  }
}

/** Substitui `process.exit` por uma implementacao que lanca, para poder capturar o exit code em teste. */
export function mockProcessExit() {
  return vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
    throw new ProcessExitSignal(code ?? 0);
  }) as never);
}

/**
 * Scripts CLI chamam `main().catch(...)` no top-level do modulo, sem `await`.
 * Importar o modulo dispara `main()` em segundo plano; esta funcao espera
 * ate que `assertion` pare de lancar (ou até o timeout do `vi.waitFor`) e
 * suprime o `unhandledRejection` gerado quando `process.exit` (mockado)
 * lanca dentro do `.catch` do script.
 */
export async function importScriptAndWait(
  modulePath: string,
  assertion: () => void | Promise<void>
) {
  const suppressUnhandledRejection = () => {};
  process.on("unhandledRejection", suppressUnhandledRejection);
  try {
    await import(/* @vite-ignore */ modulePath);
    await vi.waitFor(assertion, { timeout: 1000 });
    // da tempo para o unhandledRejection do `.catch` do script (que chama o
    // process.exit mockado, lancando de novo) ser emitido e suprimido antes
    // de remover o listener
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    process.off("unhandledRejection", suppressUnhandledRejection);
  }
}
