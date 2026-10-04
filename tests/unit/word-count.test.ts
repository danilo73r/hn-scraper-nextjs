import { describe, expect, it } from "vitest";
import { countWords } from "@/features/hacker-news/get-entries/count-words";

describe("countWords", () => {
  it("ignores standalone symbols and keeps hyphenated words together", () => {
    expect(countWords("This is - a self-explained example")).toBe(5);
  });

  it.each([
    { scenario: "an empty title", title: "", expected: 0 },
    { scenario: "only whitespace", title: " \t\n ", expected: 0 },
    { scenario: "repeated spaces", title: "  one   two  ", expected: 2 },
    { scenario: "tabs and line breaks", title: "one\ttwo\nthree", expected: 3 },
    { scenario: "only symbols", title: "- & ! 🚀", expected: 0 },
    { scenario: "symbols between words", title: "one - & two 🚀", expected: 2 },
    {
      scenario: "punctuation around words",
      title: "(hello), world!",
      expected: 2,
    },
    { scenario: "standalone numbers", title: "123 456", expected: 2 },
    {
      scenario: "letters mixed with numbers",
      title: "HTML5 ES2024",
      expected: 2,
    },
    { scenario: "accented letters", title: "café útil", expected: 2 },
    { scenario: "non-Latin letters", title: "你好 世界", expected: 2 },
    { scenario: "a hyphenated word", title: "self-explained", expected: 1 },
    { scenario: "symbols without spaces", title: "hello/world", expected: 1 },
    {
      scenario: "exactly five words",
      title: "one two three four five",
      expected: 5,
    },
    {
      scenario: "more than five words",
      title: "one two three four five six",
      expected: 6,
    },
  ])("counts $scenario", ({ title, expected }) => {
    expect(countWords(title)).toBe(expected);
  });
});
