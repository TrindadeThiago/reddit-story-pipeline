import type { RedditStory } from "../../types.js";

const REQUIRED_STRING_FIELDS = ["id", "title", "body"] as const;

/**
 * Confere que uma historia carregada de um JSON externo (manual) tem os
 * campos minimos exigidos pelo pipeline (id/title/body como texto nao
 * vazio) antes de deixar o valor seguir para o TTS.
 */
export function isValidRedditStory(value: unknown): value is RedditStory {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return REQUIRED_STRING_FIELDS.every(
    (field) => typeof record[field] === "string" && record[field].trim().length > 0
  );
}

/**
 * Como `isValidRedditStory`, mas lanca um erro identificando o(s) campo(s)
 * ausente(s)/invalido(s) em vez de so devolver `false`.
 */
export function assertValidRedditStory(value: unknown, sourceLabel: string): asserts value is RedditStory {
  if (typeof value !== "object" || value === null) {
    throw new Error(`Historia invalida em ${sourceLabel}: esperado um objeto JSON.`);
  }
  const record = value as Record<string, unknown>;
  const invalidFields = REQUIRED_STRING_FIELDS.filter(
    (field) => typeof record[field] !== "string" || (record[field] as string).trim().length === 0
  );
  if (invalidFields.length > 0) {
    throw new Error(
      `Historia invalida em ${sourceLabel}: campo(s) ausente(s) ou vazio(s): ${invalidFields.join(", ")}.`
    );
  }
}
