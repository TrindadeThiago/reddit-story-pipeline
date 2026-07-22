import { describe, expect, it } from "vitest";
import { assertValidRedditStory, isValidRedditStory } from "../../../src/modules/shared/validateStory.js";

const validStory = {
  id: "abc123",
  subreddit: "AskHistorians",
  title: "Um titulo",
  body: "Corpo da historia",
  url: "https://reddit.com/x",
  score: 10,
};

describe("isValidRedditStory", () => {
  it("aceita uma historia com id/title/body preenchidos", () => {
    expect(isValidRedditStory(validStory)).toBe(true);
  });

  it("rejeita quando body esta ausente", () => {
    const { body, ...withoutBody } = validStory;
    expect(isValidRedditStory(withoutBody)).toBe(false);
  });

  it("rejeita quando title e uma string vazia", () => {
    expect(isValidRedditStory({ ...validStory, title: "   " })).toBe(false);
  });

  it("rejeita quando id nao e uma string", () => {
    expect(isValidRedditStory({ ...validStory, id: 123 })).toBe(false);
  });

  it("rejeita valores que nao sao objeto", () => {
    expect(isValidRedditStory(null)).toBe(false);
    expect(isValidRedditStory("string")).toBe(false);
    expect(isValidRedditStory(42)).toBe(false);
  });
});

describe("assertValidRedditStory", () => {
  it("nao lanca para uma historia valida", () => {
    expect(() => assertValidRedditStory(validStory, "arquivo.json")).not.toThrow();
  });

  it("lanca identificando o campo ausente", () => {
    const { body, ...withoutBody } = validStory;
    expect(() => assertValidRedditStory(withoutBody, "arquivo.json")).toThrow(
      /arquivo\.json.*body/
    );
  });

  it("lanca identificando multiplos campos invalidos", () => {
    expect(() =>
      assertValidRedditStory({ ...validStory, title: "", body: 42 }, "arquivo.json")
    ).toThrow(/title, body/);
  });

  it("lanca para valores que nao sao objeto", () => {
    expect(() => assertValidRedditStory(null, "arquivo.json")).toThrow(/esperado um objeto JSON/);
  });
});
